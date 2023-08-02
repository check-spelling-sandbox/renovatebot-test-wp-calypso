import { START_WRITING_FLOW, DESIGN_FIRST_FLOW } from '@automattic/onboarding';
import { useDispatch, useSelect } from '@wordpress/data';
import { __experimentalMainDashboardButton as MainDashboardButton } from '@wordpress/edit-post';
import { useEffect, createPortal, useState } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';
import useSiteIntent from '../../dotcom-fse/lib/site-intent/use-site-intent';
import WpcomBlockEditorNavSidebar from './components/nav-sidebar';
import ToggleSidebarButton from './components/toggle-sidebar-button';

type CoreEditPostPlaceholder = {
	isFeatureActive: ( ...args: unknown[] ) => boolean;
};

if ( typeof MainDashboardButton !== 'undefined' ) {
	registerPlugin( 'a8c-full-site-editing-nav-sidebar', {
		render: function NavSidebar() {
			const { addEntities } = useDispatch( 'core' );

			useEffect( () => {
				// Teach core data about the status entity so we can use selectors like `getEntityRecords()`
				addEntities( [
					{
						baseURL: '/wp/v2/statuses',
						key: 'slug',
						kind: 'root',
						name: 'status',
						plural: 'statuses',
					},
				] );

				// Only register entity once
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [] );

			const { siteIntent: intent, siteIntentFetched } = useSiteIntent();
			// We check the URL param along with site intent because the param loads faster and prevents element flashing.
			const isBlogOnboardingFlow = intent === START_WRITING_FLOW || intent === DESIGN_FIRST_FLOW;

			const [ clickGuardRoot ] = useState( () => document.createElement( 'div' ) );
			useEffect( () => {
				document.body.appendChild( clickGuardRoot );
				return () => {
					document.body.removeChild( clickGuardRoot );
				};
			} );

			// Uses presence of data store to detect whether this is the experimental site editor.
			const isSiteEditor = useSelect( ( select ) => !! select( 'core/edit-site' ), [] );

			// Disable sidebar nav if the editor is not in fullscreen mode
			const isFullscreenActive = useSelect(
				( select ) =>
					( select( 'core/edit-post' ) as CoreEditPostPlaceholder ).isFeatureActive(
						'fullscreenMode'
					),
				[]
			);

			if ( ! siteIntentFetched || isBlogOnboardingFlow ) {
				return <MainDashboardButton></MainDashboardButton>;
			}

			if ( isSiteEditor || ! isFullscreenActive ) {
				return null;
			}

			return (
				<MainDashboardButton>
					<ToggleSidebarButton />
					{ createPortal( <WpcomBlockEditorNavSidebar />, clickGuardRoot ) }
				</MainDashboardButton>
			);
		},
	} );
}
