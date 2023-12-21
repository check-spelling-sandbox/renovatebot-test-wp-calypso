/**
 * External dependencies
 */
// import apiFetch from '@wordpress/api-fetch';
import proxy from 'wpcom-proxy-request';
/**
 * Types & Constants
 */
import {
	ACTION_INCREASE_AI_ASSISTANT_REQUESTS_COUNT,
	ACTION_REQUEST_AI_ASSISTANT_FEATURE,
	ACTION_SET_PLANS,
	ACTION_SET_AI_ASSISTANT_FEATURE_REQUIRE_UPGRADE,
	ACTION_STORE_AI_ASSISTANT_FEATURE,
	ACTION_SET_TIER_PLANS_ENABLED,
} from './constants';
import type { AiFeatureProps, Plan, SiteAIAssistantFeatureEndpointResponseProps } from './types';

/**
 * Map the response from the `sites/$site/ai-assistant-feature`
 * endpoint to the AI Assistant feature props.
 * @param { SiteAIAssistantFeatureEndpointResponseProps } response - The response from the endpoint.
 * @returns { AiFeatureProps }                                       The AI Assistant feature props.
 */
export function mapAiFeatureResponseToAiFeatureProps(
	response: SiteAIAssistantFeatureEndpointResponseProps
): AiFeatureProps {
	return {
		siteId: response[ 'site-id' ],
		hasFeature: !! response[ 'has-feature' ],
		isOverLimit: !! response[ 'is-over-limit' ],
		requestsCount: response[ 'requests-count' ],
		requestsLimit: response[ 'requests-limit' ],
		requireUpgrade: !! response[ 'site-require-upgrade' ],
		errorMessage: response[ 'error-message' ],
		errorCode: response[ 'error-code' ],
		upgradeType: response[ 'upgrade-type' ],
		usagePeriod: {
			currentStart: response[ 'usage-period' ]?.[ 'current-start' ],
			nextStart: response[ 'usage-period' ]?.[ 'next-start' ],
			requestsCount: response[ 'usage-period' ]?.[ 'requests-count' ] || 0,
		},
		currentTier: response[ 'current-tier' ],
		nextTier: response[ 'next-tier' ],
		tierPlansEnabled: !! response[ 'tier-plans-enabled' ],
	};
}

const actions = {
	setPlans( plans: Array< Plan > ) {
		return {
			type: ACTION_SET_PLANS,
			plans,
		};
	},

	storeAiAssistantFeature( feature: AiFeatureProps ) {
		return {
			type: ACTION_STORE_AI_ASSISTANT_FEATURE,
			feature,
		};
	},

	/**
	 * Thunk action to fetch the AI Assistant feature from the API.
	 * @returns {Function} The thunk action.
	 */
	fetchAiAssistantFeature( siteId: string ) {
		return async ( { dispatch }: { dispatch: any } ) => {
			// Dispatch isFetching action.
			dispatch( { type: ACTION_REQUEST_AI_ASSISTANT_FEATURE } );

			try {
				const response: SiteAIAssistantFeatureEndpointResponseProps = await proxy( {
					apiNamespace: 'wpcom/v2',
					path:
						'/sites/' + encodeURIComponent( String( siteId ) ) + '/jetpack-ai/ai-assistant-feature',
					query: 'force=wpcom',
				} );

				const withSiteId = { ...response, 'site-id': siteId };

				// Store the feature in the store.
				dispatch(
					actions.storeAiAssistantFeature( mapAiFeatureResponseToAiFeatureProps( withSiteId ) )
				);
			} catch ( err ) {
				// @todo: Handle error.
				console.error( err ); // eslint-disable-line no-console
			}
		};
	},

	/**
	 * This thunk action is used to increase
	 * the requests count for the current usage period.
	 * @param {number} count - The number of requests to increase. Default is 1.
	 * @returns {Function}     The thunk action.
	 */
	increaseAiAssistantRequestsCount( count: number = 1 ) {
		return ( { dispatch }: { dispatch: any } ) => {
			dispatch( {
				type: ACTION_INCREASE_AI_ASSISTANT_REQUESTS_COUNT,
				count,
			} );
		};
	},

	setAiAssistantFeatureRequireUpgrade( requireUpgrade: boolean = true ) {
		return {
			type: ACTION_SET_AI_ASSISTANT_FEATURE_REQUIRE_UPGRADE,
			requireUpgrade,
		};
	},

	setTierPlansEnabled( tierPlansEnabled: boolean = true ) {
		return {
			type: ACTION_SET_TIER_PLANS_ENABLED,
			tierPlansEnabled,
		};
	},
};

export default actions;
