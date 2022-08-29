import { StepContainer } from '@automattic/onboarding';
import { PatternPicker } from '@automattic/pattern-picker';
import { useDispatch } from '@wordpress/data';
import { useI18n } from '@wordpress/react-i18n';
import FormattedHeader from 'calypso/components/formatted-header';
import { ONBOARD_STORE } from 'calypso/landing/stepper/stores';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import type { Step } from '../../types';

import './styles.scss';

const Patterns: Step = function Patterns( { navigation } ) {
	const { goNext, goBack, submit } = navigation;
	const { setPatternId } = useDispatch( ONBOARD_STORE );
	const { __ } = useI18n();

	function handleSubmit( patternId: number ) {
		setPatternId( patternId );
		submit?.( { patternId } );
	}

	return (
		<StepContainer
			stepName={ 'patterns' }
			goBack={ goBack }
			goNext={ goNext }
			shouldHideNavButtons
			isFullLayout={ true }
			stepContent={ <PatternPicker onPick={ handleSubmit } /> }
			recordTracksEvent={ recordTracksEvent }
			formattedHeader={
				<FormattedHeader
					id={ 'seller-step-header' }
					headerText={ __( 'Choose a design to start' ) }
					align={ 'center' }
				/>
			}
		/>
	);
};

export default Patterns;
