import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import wpcomRequest, { canAccessWpcomApis } from 'wpcom-proxy-request';

interface APIFetchOptions {
	global: boolean;
	path: string;
}

interface Task {
	id: string;
	completed: boolean;
	disabled: boolean;
	title: string;
	subtitle?: string;
	badgeText?: string;
	actionDispatch?: () => void;
	isLaunchTask?: boolean;
	warning?: boolean;
	order?: number;
}

export interface ChecklistStatuses {
	links_edited?: boolean;
	site_edited?: boolean;
	site_launched?: boolean;
	first_post_published?: boolean;
	video_uploaded?: boolean;
	publish_first_course?: boolean;
	plan_selected?: boolean;
	plan_completed?: boolean;
	domain_upsell_deferred?: boolean;
}

type LaunchpadScreen = 'full' | 'off' | 'skipped' | 'minimized';

export interface LaunchpadResponse {
	site_intent?: string | null;
	launchpad_screen?: LaunchpadScreen | boolean | null | undefined;
	checklist?: Task[] | null;
	checklist_statuses?: ChecklistStatuses;
	is_enabled: boolean;
	is_dismissed: boolean;
	title?: string | null;
}

type LaunchpadUpdateSettings = {
	checklist_statuses?: Record< string, boolean >;
	is_checklist_dismissed?: {
		slug: string;
		is_dismissed: boolean;
	};
	launchpad_screen?: 'off' | 'minimized' | 'full' | 'skipped';
};

export type UseLaunchpadOptions = {
	onSuccess?: ( data: LaunchpadResponse ) => LaunchpadResponse;
};

export const fetchLaunchpad = (
	siteSlug: string | null,
	checklist_slug?: string | 0 | null | undefined,
	launchpad_context?: string | undefined
): Promise< LaunchpadResponse > => {
	const slug = encodeURIComponent( siteSlug as string );
	const checklistSlug = checklist_slug ? encodeURIComponent( checklist_slug ) : null;
	const launchpadContext = launchpad_context ? encodeURIComponent( launchpad_context ) : null;

	const requestUrl = addQueryArgs( `/sites/${ slug }/launchpad?_locale=user`, {
		...( checklistSlug && { checklist_slug: checklistSlug } ),
		...( launchpadContext && { launchpad_context: launchpadContext } ),
	} );

	return canAccessWpcomApis()
		? wpcomRequest( {
				path: requestUrl,
				apiNamespace: 'wpcom/v2',
				apiVersion: '2',
		  } )
		: apiFetch( {
				global: true,
				path: `/wpcom/v2${ requestUrl }`,
		  } as APIFetchOptions );
};

const addOrderToTask = ( task: Task, index: number ) => {
	task.order = index;
	return task;
};

export function sortLaunchpadTasksByCompletionStatus( response: LaunchpadResponse ) {
	const tasks = response.checklist || [];
	const completedTasks = tasks.filter( ( task: Task ) => task.completed );
	const incompleteTasks = tasks.filter( ( task: Task ) => ! task.completed );
	response.checklist = [ ...completedTasks, ...incompleteTasks ].map( addOrderToTask );
	return response;
}

const defaultSuccessCallback = ( response: LaunchpadResponse ) => {
	const tasks = response.checklist || [];
	response.checklist = tasks.map( addOrderToTask );
	return response;
};

export const useLaunchpad = (
	siteSlug: string | null,
	checklist_slug?: string | 0 | null | undefined,
	options?: UseLaunchpadOptions,
	launchpad_context?: string | undefined
) => {
	const key = [ 'launchpad', siteSlug, checklist_slug ];
	const onSuccessCallback = options?.onSuccess || defaultSuccessCallback;

	return useQuery( {
		queryKey: key,
		queryFn: () =>
			fetchLaunchpad( siteSlug, checklist_slug, launchpad_context ).then( onSuccessCallback ),
		retry: 3,
		initialData: {
			site_intent: '',
			launchpad_screen: undefined,
			checklist_statuses: {},
			checklist: null,
			is_enabled: false,
			is_dismissed: false,
			title: null,
		},
	} );
};

export const useSortedLaunchpadTasks = (
	siteSlug: string | null,
	checklist_slug?: string | 0 | null | undefined,
	launchpad_context?: string | undefined
) => {
	const launchpadOptions = {
		onSuccess: sortLaunchpadTasksByCompletionStatus,
	};
	return useLaunchpad( siteSlug, checklist_slug, launchpadOptions, launchpad_context );
};

export const updateLaunchpadSettings = (
	siteSlug: string | number,
	settings: LaunchpadUpdateSettings = {}
) => {
	const slug = encodeURIComponent( siteSlug as string );
	const requestUrl = `/sites/${ slug }/launchpad`;

	return canAccessWpcomApis()
		? wpcomRequest( {
				path: requestUrl,
				apiNamespace: 'wpcom/v2',
				method: 'PUT',
				body: settings,
		  } )
		: apiFetch( {
				global: true,
				path: `/wpcom/v2${ requestUrl }`,
				method: 'PUT',
				data: settings,
		  } as APIFetchOptions );
};
