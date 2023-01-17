/* eslint-disable wpcalypso/jsx-classname-namespace */
import { useLocale } from '@automattic/i18n-utils';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useI18n } from '@wordpress/react-i18n';
import classnames from 'classnames';
import wpcomProxyRequest from 'wpcom-proxy-request';
import { Plans } from 'calypso/../packages/data-stores/src';
import formatCurrency from 'calypso/../packages/format-currency/src';
import { SENSEI_FLOW, SenseiStepContainer } from 'calypso/../packages/onboarding/src';
import { useSupportedPlans } from 'calypso/../packages/plans-grid/src/hooks';
import PlanItem from 'calypso/../packages/plans-grid/src/plans-table/plan-item';
import { useNewSiteVisibility } from 'calypso/landing/gutenboarding/hooks/use-selected-plan';
import { PLANS_STORE } from 'calypso/landing/gutenboarding/stores/plans';
import {
	USER_STORE,
	ONBOARD_STORE,
	SITE_STORE,
	PRODUCTS_LIST_STORE,
} from 'calypso/landing/stepper/stores';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import { domainRegistration } from 'calypso/lib/cart-values/cart-items';
import { cartManagerClient } from 'calypso/my-sites/checkout/cart-manager-client';
import { SenseiStepError } from '../sensei-setup/sensei-step-error';
import { SenseiStepProgress, Progress } from '../sensei-setup/sensei-step-progress';
import { Tagline, Title, PlansIntervalToggle } from './components';
import type { Step } from '../../types';
import type { StyleVariation } from 'calypso/../packages/design-picker/src/types';
import type { Props as PlanItemProps } from 'calypso/../packages/plans-grid/src/plans-table/plan-item';
import 'calypso/../packages/plans-grid/src/plans-table/style.scss';
import './styles.scss';

enum Status {
	Initial,
	Bundling,
	Error,
}

const siteProgressTitle: string = __( 'Building your custom Sensei Bundle in the cart' );
const cartProgressTitle: string = __( 'Applying the Bundle discounts (nice savings for you!)' );
const styleProgressTitle: string = __( 'Double checking local currency pricing' );

const getStyleVariations = ( siteId: number, stylesheet: string ): Promise< StyleVariation[] > =>
	wpcomProxyRequest( {
		path: `/sites/${ siteId }/global-styles/themes/${ stylesheet }/variations`,
		apiNamespace: 'wp/v2',
	} );

type Theme = {
	_links: {
		'wp:user-global-styles': { href: string }[];
	};
};
const getSiteTheme = ( siteId: number, stylesheet: string ): Promise< Theme > =>
	wpcomProxyRequest( {
		path: `/sites/${ siteId }/themes/${ stylesheet }`,
		apiNamespace: 'wp/v2',
	} );

const updateGlobalStyles = (
	siteId: number,
	globalStylesId: number,
	styleVariation: StyleVariation
) =>
	wpcomProxyRequest( {
		path: `/sites/${ siteId }/global-styles/${ globalStylesId }`,
		apiNamespace: 'wp/v2',
		body: styleVariation,
		method: 'POST',
	} );

const SenseiPlan: Step = ( { flow, navigation: { goToStep } } ) => {
	const [ billingPeriod, setBillingPeriod ] = useState< Plans.PlanBillingPeriod >( 'ANNUALLY' );
	const billingPeriodIsAnnually = billingPeriod === 'ANNUALLY';
	const [ status, setStatus ] = useState< Status >( Status.Initial );
	const [ progress, setProgress ] = useState< Progress >( {
		percentage: 0,
		title: siteProgressTitle,
	} );

	const { hasTranslation } = useI18n();
	const locale = useLocale();
	const visibility = useNewSiteVisibility();
	const currentUser = useSelect( ( select ) => select( USER_STORE ).getCurrentUser() );
	const { supportedPlans } = useSupportedPlans( locale, billingPeriod );
	const { createSenseiSite, setSelectedSite } = useDispatch( ONBOARD_STORE );
	const { getSelectedDomain, getSelectedStyleVariation } = useSelect( ( select ) =>
		select( ONBOARD_STORE )
	);
	const domain = getSelectedDomain();
	const { getNewSite } = useSelect( ( select ) => select( SITE_STORE ) );
	const { getPlanProduct } = useSelect( ( select ) => select( PLANS_STORE ) );

	const { saveSiteSettings, setIntentOnSite } = useDispatch( SITE_STORE );

	const planObject = supportedPlans.find( ( plan ) => {
		return plan && 'business' === plan.periodAgnosticSlug;
	} );

	const handlePlanBillingPeriodChange = ( newBillingPeriod: Plans.PlanBillingPeriod ) => {
		setBillingPeriod( newBillingPeriod );
	};

	const woothemesProduct = useSelect(
		( select ) => {
			const yearly = select( PRODUCTS_LIST_STORE ).getProductBySlug( 'woothemes_sensei_yearly' );
			const monthly = select( PRODUCTS_LIST_STORE ).getProductBySlug( 'woothemes_sensei_monthly' );

			if ( ! yearly || ! monthly ) {
				return {
					monthlyPrice: 0,
					yearlyPrice: 0,
					price: 0,
					productSlug: '',
					currencyCode: '',
				};
			}

			return {
				monthlyPrice: monthly.cost,
				yearlyPrice: yearly.cost,
				price: billingPeriodIsAnnually ? Math.ceil( yearly.cost / 12 ) : monthly.cost,
				productSlug: billingPeriodIsAnnually ? yearly.product_slug : monthly.product_slug,
				currencyCode: yearly.currency_code,
			};
		},
		[ billingPeriodIsAnnually ]
	);

	const planProduct = useSelect(
		( select ) => {
			const monthly = select( PLANS_STORE ).getPlanProduct(
				planObject?.periodAgnosticSlug,
				'MONTHLY'
			);
			const yearly = select( PLANS_STORE ).getPlanProduct(
				planObject?.periodAgnosticSlug,
				'ANNUALLY'
			);
			if ( ! yearly || ! monthly ) {
				return {
					monthlyPrice: 0,
					yearlyPrice: 0,
					price: 0,
					productSlug: '',
				};
			}

			return {
				monthlyPrice: monthly.rawPrice,
				yearlyPrice: yearly.rawPrice,
				price: billingPeriodIsAnnually ? Math.ceil( yearly.rawPrice / 12 ) : monthly.rawPrice,
				productSlug: '',
			};
		},
		[ billingPeriodIsAnnually, planObject ]
	);

	const goToDomainStep = useCallback( () => {
		if ( goToStep ) {
			goToStep( 'senseiDomain' );
		}
	}, [ goToStep ] );

	const onPlanSelect = async () => {
		try {
			setStatus( Status.Bundling );

			// Wait for a bit to get an animation in the beginning of site creation.
			await new Promise( ( res ) => setTimeout( res, 100 ) );

			setProgress( {
				percentage: 25,
				title: siteProgressTitle,
			} );

			await createSenseiSite( {
				username: currentUser?.username || '',
				languageSlug: locale,
				visibility,
			} );

			setProgress( {
				percentage: 50,
				title: cartProgressTitle,
			} );

			const newSite = getNewSite();
			const siteId = newSite?.blogid;
			setSelectedSite( newSite?.blogid );
			await setIntentOnSite( newSite?.site_slug as string, SENSEI_FLOW );
			await saveSiteSettings( newSite?.blogid as number, { launchpad_screen: 'full' } );

			setProgress( {
				percentage: 75,
				title: styleProgressTitle,
			} );

			if ( siteId ) {
				const selectedStyleVariationTitle = getSelectedStyleVariation()?.title;
				const styleVariations: StyleVariation[] = await getStyleVariations( siteId, 'pub/course' );
				const theme: Theme = await getSiteTheme( siteId, 'pub/course' );
				const userGlobalStylesLink: string =
					theme?._links?.[ 'wp:user-global-styles' ]?.[ 0 ]?.href || '';
				const userGlobalStylesId = parseInt( userGlobalStylesLink.split( '/' ).pop() || '', 10 );
				const styleVariation = styleVariations.find(
					( variation ) => variation.title === selectedStyleVariationTitle
				);
				if ( styleVariation && userGlobalStylesId && ! isNaN( userGlobalStylesId ) ) {
					await updateGlobalStyles( siteId, userGlobalStylesId, styleVariation );
				}
			}
			setProgress( {
				percentage: 100,
				title: styleProgressTitle,
			} );

			const planProductObject = getPlanProduct( planObject?.periodAgnosticSlug, billingPeriod );

			const cartKey = await cartManagerClient.getCartKeyForSiteSlug( newSite?.site_slug as string );

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const productsToAdd: any[] = [
				{
					product_slug: planProductObject?.storeSlug,
					extra: {
						signup_flow: flow,
					},
				},
				{
					product_slug: woothemesProduct.productSlug,
					extra: {
						signup_flow: flow,
					},
				},
			];

			if ( domain && domain.product_slug ) {
				const registration = domainRegistration( {
					domain: domain.domain_name,
					productSlug: domain.product_slug as string,
					extra: { privacy_available: domain.supports_privacy },
				} );

				productsToAdd.push( registration );
			}

			await cartManagerClient.forCartKey( cartKey ).actions.addProductsToCart( productsToAdd );
			const redirectTo = encodeURIComponent(
				`/setup/sensei/senseiLaunch?siteSlug=${ newSite?.site_slug }&siteId=${ newSite?.blogid }`
			);

			window.location.replace(
				`/checkout/${ newSite?.site_slug }?signup=1&redirect_to=${ redirectTo }`
			);
		} catch ( err ) {
			setStatus( Status.Error );
		}
	};

	const features: PlanItemProps[ 'features' ] = [
		{
			name: __( 'Priority live chat support' ),
			requiresAnnuallyBilledPlan: true,
		},
		{
			name: __( 'Unlimited courses and students' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( 'Interactive videos and lessons' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( 'Quizzes and certificates' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( 'Sell courses and subscriptions' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( '200GB file and video storage' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( 'Best-in-class hosting' ),
			requiresAnnuallyBilledPlan: false,
		},
		{
			name: __( 'Advanced Jetpack features' ),
			requiresAnnuallyBilledPlan: false,
		},
	];

	const currencyCode = woothemesProduct.currencyCode;
	const isLoading = ! planProduct.monthlyPrice || ! woothemesProduct.monthlyPrice;
	const price = planProduct.price + woothemesProduct.price;
	const priceStr = formatCurrency( price, currencyCode, { stripZeros: true } );
	const monthlyPrice = planProduct.monthlyPrice + woothemesProduct.monthlyPrice;
	const annualPrice = planProduct.yearlyPrice + woothemesProduct.yearlyPrice;
	const annualPriceStr = formatCurrency( annualPrice, currencyCode, { stripZeros: true } );
	const annualSavings = monthlyPrice * 12 - annualPrice;
	const annualSavingsStr = formatCurrency( annualSavings, currencyCode, { stripZeros: true } );
	const domainSavings = domain?.raw_price || 0;
	const annualDiscount =
		100 - Math.floor( ( annualPrice / ( monthlyPrice * 12 + domainSavings ) ) * 100 );

	// translators: %s is the cost per year (e.g "billed as 96$ annually")
	const newPlanItemPriceLabelAnnually = __(
		'per month, billed as %s annually',
		__i18n_text_domain__
	);

	const fallbackPlanItemPriceLabelAnnually = __( 'billed annually', __i18n_text_domain__ );

	const planItemPriceLabelAnnually =
		locale === 'en' || hasTranslation?.( 'per month, billed as %s annually' )
			? sprintf( newPlanItemPriceLabelAnnually, annualPriceStr )
			: fallbackPlanItemPriceLabelAnnually;

	const planItemPriceLabelMonthly = __( 'per month, billed monthly', __i18n_text_domain__ );
	const title = __( 'Sensei Pro Bundle' );

	return (
		<SenseiStepContainer stepName="senseiPlan" recordTracksEvent={ recordTracksEvent }>
			{ status === Status.Initial && (
				<>
					<Title>{ __( 'Choose Monthly or Annually' ) }</Title>

					<Tagline>
						{ __( 'Sensei + WooCommerce + Jetpack + WordPress.com in the ultimate Course Bundle' ) }
					</Tagline>

					<PlansIntervalToggle
						intervalType={ billingPeriod }
						onChange={ handlePlanBillingPeriodChange }
						maxMonthlyDiscountPercentage={ annualDiscount }
					/>

					<div
						className={ classnames( 'plan-item plan-item--sensei', {
							'plan-item--is-loading': isLoading,
						} ) }
					>
						<div tabIndex={ 0 } role="button" className="plan-item__summary">
							<div className="plan-item__heading">
								<div className="plan-item__name">{ title }</div>
							</div>
							<div className="plan-item__price">
								<div className="plan-item__price-amount">{ ! isLoading && priceStr }</div>
							</div>
						</div>
						<div className="plan-item__price-note">
							{ ! isLoading && billingPeriod === 'ANNUALLY'
								? planItemPriceLabelAnnually
								: planItemPriceLabelMonthly }
						</div>

						{ /*
							For the free plan, the following div is still rendered invisible
							and ignored by screen readers (via aria-hidden) to ensure the same
							vertical spacing as the rest of the plan cards
						 */ }
						<div
							className={ classnames( 'plan-item__price-discount', {
								'plan-item__price-discount--disabled': billingPeriod !== 'ANNUALLY',
							} ) }
						>
							{ ! isLoading &&
								sprintf(
									// Translators: will be like "Save 30% by paying annually".  Make sure the % symbol is kept.
									__( `You're saving %s by paying annually`, __i18n_text_domain__ ),
									annualSavingsStr
								) }
						</div>
					</div>
					<PlanItem
						allPlansExpanded
						slug="business"
						domain={ domain }
						CTAVariation="NORMAL"
						features={ features }
						billingPeriod={ billingPeriod }
						name={ title }
						onSelect={ onPlanSelect }
						onPickDomainClick={ goToDomainStep }
						CTAButtonLabel={ __( 'Get Sensei Pro Bundle' ) }
					/>
				</>
			) }
			{ status === Status.Bundling && <SenseiStepProgress progress={ progress } /> }
			{ status === Status.Error && <SenseiStepError /> }
		</SenseiStepContainer>
	);
};

export default SenseiPlan;
