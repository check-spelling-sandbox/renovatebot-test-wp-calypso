import { render, screen } from '@testing-library/react';
import React from 'react';
import ChecklistItem, { type Props } from '..';
import { buildTask } from '../../test/lib/fixtures';
import '@testing-library/jest-dom';

describe( 'ChecklistItem', () => {
	const defaultProps = {
		task: buildTask( { completed: false, disabled: false } ),
		onClick: jest.fn(),
	};

	const renderComponent = ( props: Partial< Props > ) => {
		render( <ChecklistItem { ...defaultProps } { ...props } /> );
	};
	it( 'displays a badge', () => {
		const badge_text = 'Badge Text';
		renderComponent( { task: buildTask( { badge_text } ) } );
		expect( screen.getByText( badge_text ) ).toBeVisible();
	} );

	it( 'hides the task complete icon when the task is not completed', () => {
		renderComponent( { task: buildTask( { completed: false } ) } );
		const taskCompleteIcon = screen.queryByLabelText( 'Task complete' );
		expect( taskCompleteIcon ).not.toBeInTheDocument();
	} );

	describe( 'when the task is disabled', () => {
		it( 'disables the button', () => {
			renderComponent( { task: buildTask( { disabled: true } ) } );
			const taskButton = screen.queryByRole( 'button' );
			expect( taskButton ).toBeDisabled();
		} );

		it( 'hides the task enabled icon', () => {
			renderComponent( { task: buildTask( { disabled: true } ) } );
			const taskEnabledIcon = screen.queryByLabelText( 'Task enabled' );
			expect( taskEnabledIcon ).not.toBeInTheDocument();
		} );
	} );

	describe( 'when the task is completed', () => {
		it( 'shows the task completed icon', () => {
			renderComponent( { task: buildTask( { completed: true } ) } );
			const taskCompleteIcon = screen.queryByLabelText( 'Task complete' );
			expect( taskCompleteIcon ).toBeVisible();
		} );

		it( 'hides the task enabled icon', () => {
			renderComponent( { task: buildTask( { completed: true } ) } );
			const taskEnabledIcon = screen.queryByLabelText( 'Task enabled' );
			expect( taskEnabledIcon ).not.toBeInTheDocument();
		} );

		it( 'disables the task', () => {
			renderComponent( { task: buildTask( { completed: true } ) } );
			const taskButton = screen.queryByRole( 'button' );
			expect( taskButton ).toBeDisabled();
		} );

		describe( 'and the task is kept enabled', () => {
			it( 'hides the task enabled icon', () => {
				renderComponent( { task: buildTask( { completed: true, disabled: false } ) } );
				const taskEnabledIcon = screen.queryByLabelText( 'Task enabled' );
				expect( taskEnabledIcon ).not.toBeInTheDocument();
			} );

			it( 'enables the task', () => {
				renderComponent( { task: buildTask( { completed: true, disabled: false } ) } );
				const taskButton = screen.queryByRole( 'button' );
				expect( taskButton ).toBeEnabled();
			} );
		} );
	} );

	describe( 'when a task is a primary action', () => {
		it( 'displays a primary button', () => {
			renderComponent( { isPrimaryAction: true } );
			const taskButton = screen.queryByRole( 'button' );
			expect( taskButton?.className ).toContain( 'checklist-item__checklist-primary-button' );
		} );
	} );
} );
