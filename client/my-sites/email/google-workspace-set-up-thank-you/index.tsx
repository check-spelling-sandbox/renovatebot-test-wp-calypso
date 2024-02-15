import {
	isGoogleWorkspaceExtraLicence,
	isGSuiteExtraLicenseProductSlug,
} from '@automattic/calypso-products';
import { useTranslate } from 'i18n-calypso';
import ThankYouV2 from 'calypso/components/thank-you-v2';
import { getGoogleMailServiceFamily } from 'calypso/lib/gsuite';
import { ThankYouGoogleWorkspaceProduct } from 'calypso/my-sites/checkout/checkout-thank-you/redesign-v2/products/google-workspace-product';
import { useSelector } from 'calypso/state';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import type { ReceiptPurchase } from 'calypso/state/receipts/types';

type GoogleWorkspaceSetUpThankYouProps = {
	purchase: ReceiptPurchase;
};

export const GoogleWorkspaceSetUpThankYou = ( { purchase }: GoogleWorkspaceSetUpThankYouProps ) => {
	const domainName = purchase.meta;
	const productFamily = getGoogleMailServiceFamily( purchase?.productSlug );
	const selectedSite = useSelector( getSelectedSite );
	const translate = useTranslate();

	const footerDetails = [
		{
			key: 'footer-extra-info',
			title: translate( 'Everything you need to know' ),
			description: translate( 'Explore our support guides and find an answer to every question.' ),
			buttonText: translate( 'Explore support resources' ),
			buttonHref: '/support/',
		},
		{
			key: 'footer-plugins',
			title: translate( "There's a plugin for that" ),
			description: translate(
				"With 54,000+ plugins and apps, you'll never outgrow your website. If you can think of it, there's a plugin to make it happen."
			),
			buttonText: translate( 'Discover plugins' ),
			buttonHref: '/plugins/',
		},
	];

	let title;
	let subtitle;

	if (
		isGoogleWorkspaceExtraLicence( purchase ) ||
		isGSuiteExtraLicenseProductSlug( purchase.productSlug )
	) {
		title = translate( 'Say hello to your new email address' );
		subtitle = translate( "All set! Now it's time to update your contact details." );
	} else {
		title = translate( 'Congratulations on your purchase!' );
		subtitle = translate(
			'Complete your %(productFamily)s setup to start sending and receiving emails from your custom domain today.',
			{
				args: { productFamily },
			}
		);
	}

	const products = (
		<ThankYouGoogleWorkspaceProduct
			productFamily={ productFamily }
			domainName={ domainName }
			siteSlug={ selectedSite?.slug }
			numberOfMailboxesPurchased={ purchase.newQuantity }
		/>
	);

	return (
		<>
			<ThankYouV2
				title={ title }
				subtitle={ subtitle }
				products={ products }
				footerDetails={ footerDetails }
			/>
		</>
	);
};
