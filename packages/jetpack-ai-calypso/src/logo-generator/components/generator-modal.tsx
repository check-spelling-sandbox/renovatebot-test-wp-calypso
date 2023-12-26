/**
 * External dependencies
 */
import { Icon, Modal, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { external } from '@wordpress/icons';
import React, { useState, useEffect } from 'react';
/**
 * Internal dependencies
 */
import { FirstLoadScreen } from './first-load-screen';
import { LogoPresenter } from './logo-presenter';
import { Prompt } from './prompt';
import './generator-modal.scss';
/**
 * Types
 */
import type { GeneratorModalProps } from '../../types';

export const GeneratorModal: React.FC< GeneratorModalProps > = ( { isOpen, onClose } ) => {
	const [ isLoading, setIsLoading ] = useState( true );

	useEffect( () => {
		if ( isOpen ) {
			setTimeout( () => {
				setIsLoading( false );
			}, 1000 );
		} else {
			setIsLoading( true );
		}
	}, [ isOpen ] );

	return (
		<>
			{ isOpen && (
				<Modal
					className="jetpack-ai-logo-generator-modal"
					onRequestClose={ onClose }
					shouldCloseOnClickOutside={ false }
					shouldCloseOnEsc={ false }
					title={ __( 'Jetpack AI Logo Generator', 'jetpack' ) }
				>
					<div className="jetpack-ai-logo-generator-modal__body">
						{ isLoading ? (
							<FirstLoadScreen />
						) : (
							<>
								<Prompt />
								<LogoPresenter description="A publishing company in the form of a greek statue." />
								<div className="jetpack-ai-logo-generator__carousel">{ /** carousel row */ }</div>
								<div className="jetpack-ai-logo-generator__footer">
									<Button
										variant="link"
										className="jetpack-ai-logo-generator__feedback-button"
										href="https://jetpack.com/redirect/?source=jetpack-ai-feedback"
										target="_blank"
									>
										<span>{ __( 'Provide feedback', 'jetpack' ) }</span>
										<Icon icon={ external } className="icon" />
									</Button>
								</div>
							</>
						) }
					</div>
				</Modal>
			) }
		</>
	);
};
