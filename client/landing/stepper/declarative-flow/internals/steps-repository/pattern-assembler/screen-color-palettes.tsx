import { Button } from '@automattic/components';
import { ColorPaletteVariations } from '@automattic/global-styles';
import { __experimentalNavigatorBackButton as NavigatorBackButton } from '@wordpress/components';
import { useTranslate } from 'i18n-calypso';
import NavigatorHeader from './navigator-header';
import type { GlobalStylesObject } from '@automattic/global-styles';

interface Props {
	siteId: number | string;
	stylesheet: string;
	selectedColorPaletteVariation: GlobalStylesObject | null;
	onSelect: ( colorPaletteVariation: GlobalStylesObject | null ) => void;
	onDoneClick: () => void;
}

const ScreenColorPalettes = ( {
	siteId,
	stylesheet,
	selectedColorPaletteVariation,
	onSelect,
	onDoneClick,
}: Props ) => {
	const translate = useTranslate();

	return (
		<>
			<NavigatorHeader
				title={ translate( 'Colors' ) }
				description={ translate( 'Foreground and background colors used throughout your site.' ) }
			/>
			<div className="screen-container__body">
				<ColorPaletteVariations
					siteId={ siteId }
					stylesheet={ stylesheet }
					selectedColorPaletteVariation={ selectedColorPaletteVariation }
					onSelect={ onSelect }
				/>
			</div>
			<div className="screen-container__footer">
				<NavigatorBackButton
					as={ Button }
					className="pattern-assembler__button"
					onClick={ onDoneClick }
					primary
				>
					{ translate( 'Done' ) }
				</NavigatorBackButton>
			</div>
		</>
	);
};

export default ScreenColorPalettes;
