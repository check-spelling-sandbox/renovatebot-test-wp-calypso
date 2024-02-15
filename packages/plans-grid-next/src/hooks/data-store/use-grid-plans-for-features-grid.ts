import { FeatureList } from '@automattic/calypso-products';
import { useMemo } from '@wordpress/element';
import { GridPlan, PlansIntent } from '../../types';
import usePlanFeaturesForGridPlans from './use-plan-features-for-grid-plans';

interface Params {
	allFeaturesList: FeatureList;
	availablePlans: Omit< GridPlan, 'features' >[];
	gridPlans: Omit< GridPlan, 'features' >[];
	intent?: PlansIntent;
	isInSignup?: boolean;
	selectedFeature?: string | null;
	showLegacyStorageFeature?: boolean;
}

const useGridPlansForFeaturesGrid = ( {
	allFeaturesList,
	availablePlans,
	gridPlans,
	intent,
	isInSignup,
	selectedFeature,
	showLegacyStorageFeature,
}: Params ): GridPlan[] => {
	const planFeaturesForFeaturesGrid = usePlanFeaturesForGridPlans( {
		allFeaturesList,
		gridPlans: availablePlans,
		intent,
		isInSignup,
		selectedFeature,
		showLegacyStorageFeature,
	} );

	return useMemo( () => {
		return gridPlans.reduce( ( acc, gridPlan ) => {
			if ( gridPlan.isVisible ) {
				return [
					...acc,
					{
						...gridPlan,
						features: planFeaturesForFeaturesGrid[ gridPlan.planSlug ],
					},
				];
			}
			return acc;
		}, [] as GridPlan[] );
	}, [ gridPlans, planFeaturesForFeaturesGrid ] );
};

export default useGridPlansForFeaturesGrid;
