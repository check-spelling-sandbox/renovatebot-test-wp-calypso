import { isBlogOnboardingFlow, isSiteAssemblerFlow } from '@automattic/onboarding';
import { addQueryArgs } from '@wordpress/url';
import { translate } from 'i18n-calypso';
import { recordTaskClickTracksEvent } from '../../task-helper';
import { TaskAction, TaskActionTable, EnhancedTask } from '../../types';

const getDomainUpSell: TaskAction = ( task, flow, context ): EnhancedTask => {
	const { siteInfoQueryArgs, domainUpsellCompleted, site } = context;

	const getDestionationUrl = () => {
		if ( isBlogOnboardingFlow( flow ) || isSiteAssemblerFlow( flow ) ) {
			return addQueryArgs( `/setup/${ flow }/domains`, {
				...siteInfoQueryArgs,
				flowToReturnTo: flow,
				new: site?.name,
				domainAndPlanPackage: true,
			} );
		}

		return domainUpsellCompleted
			? `/domains/manage/${ siteInfoQueryArgs?.siteSlug }`
			: addQueryArgs( `/setup/domain-upsell/domains`, {
					...siteInfoQueryArgs,
					flowToReturnTo: flow,
					new: site?.name,
			  } );
	};

	return {
		...task,
		completed: domainUpsellCompleted,
		actionDispatch: () => recordTaskClickTracksEvent( flow, domainUpsellCompleted, task.id ),
		calypso_path: getDestionationUrl(),
		badge_text:
			domainUpsellCompleted || isBlogOnboardingFlow( flow ) || isSiteAssemblerFlow( flow )
				? ''
				: translate( 'Upgrade plan' ),
		useCalypsoPath: true,
	};
};

export const actions: Partial< TaskActionTable > = {
	domain_upsell: getDomainUpSell,
};
