import { getQueryArg } from '@wordpress/url';
import { useTranslate } from 'i18n-calypso';
import page from 'page';
import { useCallback } from 'react';
import { useIssueAndAssignLicenses } from 'calypso/jetpack-cloud/sections/partner-portal/hooks';
import { partnerPortalBasePath } from 'calypso/lib/jetpack/paths';
import { addQueryArgs } from 'calypso/lib/url';
import { useDispatch, useSelector } from 'calypso/state';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { errorNotice } from 'calypso/state/notices/actions';
import { doesPartnerRequireAPaymentMethod } from 'calypso/state/partner-portal/partner/selectors';
import { APIError } from 'calypso/state/partner-portal/types';
import type { SiteDetails } from '@automattic/data-stores';

const containEquivalentItems = ( arr1: string[], arr2: string[] ) => {
	if ( arr1.length !== arr2.length ) {
		return false;
	}

	const [ sorted1, sorted2 ] = [ [ ...arr1 ].sort(), [ ...arr2 ].sort() ];
	for ( let i = 0; i < sorted1.length; ++i ) {
		// If the two lists are sorted and an element differs between the two
		// at any index, they must not contain exactly the same items
		// in exactly the same quantities
		if ( sorted1[ i ] !== sorted2[ i ] ) {
			return false;
		}
	}

	return true;
};

const useSubmitForm = ( selectedSite?: SiteDetails | null, suggestedProductSlugs?: string[] ) => {
	const dispatch = useDispatch();
	const translate = useTranslate();

	const { issueAndAssignLicenses, isReady: isIssueAndAssignLicensesReady } =
		useIssueAndAssignLicenses( selectedSite, {
			onIssueError: ( error: APIError ) => {
				if ( error.code === 'missing_valid_payment_method' ) {
					dispatch(
						errorNotice(
							translate(
								'A primary payment method is required.{{br/}} {{a}}Try adding a new payment method{{/a}} or contact support.',
								{
									components: {
										a: (
											<a href="/partner-portal/payment-methods/add?return=/partner-portal/issue-license" />
										),
										br: <br />,
									},
								}
							)
						)
					);

					return;
				}

				dispatch( errorNotice( error.message ) );
			},
			onAssignError: ( error: Error ) =>
				dispatch( errorNotice( error.message, { isPersistent: true } ) ),
		} );
	const paymentMethodRequired = useSelector( doesPartnerRequireAPaymentMethod );

	const maybeTrackUnsuggestedSelection = useCallback(
		( selectedSlugs: string[] ) => {
			// No suggested products; do nothing
			if ( ! suggestedProductSlugs?.length ) {
				return;
			}

			// Selected products match the suggested ones; do nothing
			if ( containEquivalentItems( selectedSlugs, suggestedProductSlugs ) ) {
				return;
			}

			// We want to know when someone purchases different product(s)
			// from what we recommend on the dashboard
			dispatch(
				recordTracksEvent(
					'calypso_partner_portal_issue_multiple_licenses_changed_selection_after_dashboard_visit'
				)
			);
		},
		[ dispatch, suggestedProductSlugs ]
	);

	const submitForm = useCallback(
		( slugsToIssue: string[] ) => {
			// Record the user's intent to issue licenses for these product(s)
			dispatch(
				recordTracksEvent( 'calypso_partner_portal_issue_multiple_licenses_submit', {
					products: slugsToIssue.join( ',' ),
				} )
			);

			maybeTrackUnsuggestedSelection( slugsToIssue );

			const fromDashboard = getQueryArg( window.location.href, 'source' ) === 'dashboard';

			// If we need a payment method, redirect now to have the user enter one
			if ( paymentMethodRequired ) {
				const nextStep = addQueryArgs(
					{
						products: slugsToIssue.join( ',' ),
						...( selectedSite?.ID && { site_id: selectedSite?.ID } ),
						...( fromDashboard && { source: 'dashboard' } ),
					},
					partnerPortalBasePath( '/payment-methods/add' )
				);

				page( nextStep );
				return;
			}

			issueAndAssignLicenses( slugsToIssue );
		},
		[
			dispatch,
			issueAndAssignLicenses,
			maybeTrackUnsuggestedSelection,
			paymentMethodRequired,
			selectedSite?.ID,
		]
	);

	return {
		isReady: isIssueAndAssignLicensesReady,
		submitForm,
	};
};

export default useSubmitForm;
