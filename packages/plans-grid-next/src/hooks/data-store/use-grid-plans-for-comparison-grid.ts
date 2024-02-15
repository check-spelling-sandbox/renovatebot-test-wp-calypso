import {
	FeatureList,
	PLAN_ENTERPRISE_GRID_WPCOM,
	PLAN_HOSTING_TRIAL_MONTHLY,
	PlanSlug,
	TERMS_LIST,
} from '@automattic/calypso-products';
import { AddOnMeta } from '@automattic/data-stores';
import { UseCheckPlanAvailabilityForPurchase } from '@automattic/data-stores/src/plans';
import { useMemo } from 'react';
import { GridPlan, PlansIntent } from '../../types';
import useFilterPlansForPlanFeatures from './use-filter-plans-for-plan-features';
import useGridPlans, { UseFreeTrialPlanSlugs } from './use-grid-plans';
import useRestructuredPlanFeaturesForComparisonGrid from './use-restructured-plan-features-for-comparison-grid';

interface Params {
	allFeaturesList: FeatureList;
	intent?: PlansIntent;
	selectedFeature?: string | null;
	showLegacyStorageFeature?: boolean;
	hideFreePlan?: boolean;
	hidePersonalPlan?: boolean;
	hidePremiumPlan?: boolean;
	hideBusinessPlan?: boolean;
	hideEcommercePlan?: boolean;
	hideEnterprisePlan?: boolean;
	eligibleForFreeHostingTrial: boolean;
	useFreeTrialPlanSlugs: UseFreeTrialPlanSlugs;
	term?: ( typeof TERMS_LIST )[ number ];
	selectedPlan?: PlanSlug;
	sitePlanSlug?: PlanSlug | null;
	useCheckPlanAvailabilityForPurchase: UseCheckPlanAvailabilityForPurchase;
	storageAddOns: ( AddOnMeta | null )[];
	coupon?: string;
	isSubdomainNotGenerated: boolean;
	siteId?: number | null;
	isDisplayingPlansNeededForFeature: boolean;
}

const useGridPlansForComparisonGrid = ( {
	allFeaturesList,
	intent,
	selectedFeature,
	showLegacyStorageFeature,
	hideFreePlan,
	hidePersonalPlan,
	hidePremiumPlan,
	hideBusinessPlan,
	hideEcommercePlan,
	hideEnterprisePlan,
	eligibleForFreeHostingTrial,
	useFreeTrialPlanSlugs,
	term,
	selectedPlan,
	sitePlanSlug,
	useCheckPlanAvailabilityForPurchase,
	storageAddOns,
	coupon,
	isSubdomainNotGenerated,
	siteId,
	isDisplayingPlansNeededForFeature,
}: Params ): GridPlan[] => {
	const gridPlans = useGridPlans( {
		allFeaturesList,
		useFreeTrialPlanSlugs,
		selectedFeature,
		intent,
		term,
		selectedPlan,
		sitePlanSlug,
		useCheckPlanAvailabilityForPurchase,
		storageAddOns,
		coupon,
		hideEnterprisePlan,
		eligibleForFreeHostingTrial,
		showLegacyStorageFeature,
		isSubdomainNotGenerated,
		selectedSiteId: siteId,
	} );

	// TODO: `useFilterPlansForPlanFeatures` should gradually deprecate and whatever remains to fall into the `useGridPlans` hook
	const filteredPlansForPlanFeatures = useFilterPlansForPlanFeatures( {
		plans: gridPlans || [],
		isDisplayingPlansNeededForFeature,
		selectedPlan,
		hideFreePlan,
		hidePersonalPlan,
		hidePremiumPlan,
		hideBusinessPlan,
		hideEcommercePlan,
	} );

	const planFeaturesForComparisonGrid = useRestructuredPlanFeaturesForComparisonGrid( {
		allFeaturesList,
		gridPlans: filteredPlansForPlanFeatures,
		intent,
		selectedFeature,
		showLegacyStorageFeature,
	} );

	return useMemo( () => {
		const hiddenPlans = [ PLAN_HOSTING_TRIAL_MONTHLY, PLAN_ENTERPRISE_GRID_WPCOM ];

		if ( ! gridPlans ) {
			return [];
		}

		return gridPlans.reduce( ( acc, gridPlan ) => {
			if ( gridPlan.isVisible && ! hiddenPlans.includes( gridPlan.planSlug ) ) {
				return [
					...acc,
					{
						...gridPlan,
						features: planFeaturesForComparisonGrid[ gridPlan.planSlug ],
					},
				];
			}

			return acc;
		}, [] as GridPlan[] );
	}, [ gridPlans, planFeaturesForComparisonGrid ] );
};

export default useGridPlansForComparisonGrid;
