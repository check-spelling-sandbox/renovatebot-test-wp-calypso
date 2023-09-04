import { AddOnMeta, WpcomPlansUI } from '@automattic/data-stores';
import { CustomSelectControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { TranslateResult, useTranslate } from 'i18n-calypso';
import { usePlansGridContext } from '../grid-context';
import { getStorageStringFromFeature } from '../util';
import type { PlanSlug, StorageOption, WPComStorageAddOnSlug } from '@automattic/calypso-products';

type StorageAddOnDropdownProps = {
	label?: string;
	planSlug: PlanSlug;
	storageOptions: StorageOption[];
	showCost?: boolean;
};

type StorageAddOnOptionProps = {
	title: string;
	cost: string | undefined;
	showCost: boolean;
};

const getStorageOptionPrice = (
	storageAddOnsForPlan: ( AddOnMeta | null )[] | null,
	storageOptionSlug: string
) => {
	return storageAddOnsForPlan?.find( ( addOn ) => {
		return addOn?.featureSlugs?.includes( storageOptionSlug );
	} )?.prices?.formattedMonthlyPrice;
};

const StorageAddOnOption = ( { title, cost, showCost }: StorageAddOnOptionProps ) => {
	const translate = useTranslate();
	return (
		<>
			{ cost && showCost ? (
				<div>
					<span className="storage-add-on-dropdown-option__title">{ title }</span>
					<span className="storage-add-on-dropdown-option__cost">
						{ ` + ${ cost }/${ translate( 'month' ) }` }
					</span>
				</div>
			) : (
				<span className="storage-add-on-dropdown-option__title">{ title }</span>
			) }
		</>
	);
};

export const StorageAddOnDropdown = ( {
	label = '',
	planSlug,
	storageOptions,
	showCost = false,
}: StorageAddOnDropdownProps ) => {
	const { gridPlansIndex } = usePlansGridContext();
	const { storageAddOnsForPlan } = gridPlansIndex[ planSlug ];
	const { setSelectedStorageOptionForPlan } = useDispatch( WpcomPlansUI.store );
	const selectedStorageOptionForPlan = useSelect(
		( select ) => {
			return select( WpcomPlansUI.store ).getSelectedStorageOptionForPlan( planSlug );
		},
		[ planSlug ]
	);

	// TODO: Consider transforming storageOptions outside of this component
	const selectControlOptions = storageOptions.reduce( ( acc, storageOption ) => {
		const title = getStorageStringFromFeature( storageOption.slug ) || '';
		const cost = getStorageOptionPrice( storageAddOnsForPlan, storageOption.slug );
		acc.push( {
			key: storageOption?.slug,
			name: <StorageAddOnOption title={ title } cost={ cost } showCost={ showCost } />,
		} );

		return acc;
	}, [] as { key: string; name: TranslateResult }[] );

	const defaultStorageOption = storageOptions.find( ( storageOption ) => ! storageOption?.isAddOn );
	const selectedOptionKey = selectedStorageOptionForPlan || defaultStorageOption?.slug || '';
	const selectedOptionPrice = getStorageOptionPrice( storageAddOnsForPlan, selectedOptionKey );
	const selectedOptionTitle = getStorageStringFromFeature( selectedOptionKey ) || '';
	const selectedOption = {
		key: selectedOptionKey,
		name: (
			<StorageAddOnOption
				title={ selectedOptionTitle }
				cost={ selectedOptionPrice }
				showCost={ showCost }
			/>
		),
	};
	return (
		<CustomSelectControl
			label={ label }
			options={ selectControlOptions }
			value={ selectedOption }
			onChange={ ( { selectedItem }: { selectedItem: { key: WPComStorageAddOnSlug } } ) =>
				setSelectedStorageOptionForPlan( { addOnSlug: selectedItem?.key || '', planSlug } )
			}
		/>
	);
};

export default StorageAddOnDropdown;
