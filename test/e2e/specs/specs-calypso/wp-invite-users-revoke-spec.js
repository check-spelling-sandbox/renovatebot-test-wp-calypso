/**
 * External dependencies
 */
import assert from 'assert';
import config from 'config';

/**
 * Internal dependencies
 */
import LoginFlow from '../../lib/flows/login-flow.js';

import AcceptInvitePage from '../../lib/pages/accept-invite-page.js';
import PeoplePage from '../../lib/pages/people-page.js';
import RevokePage from '../../lib/pages/revoke-page.js';
import InviteErrorPage from '../../lib/pages/invite-error-page.js';
import InvitePeoplePage from '../../lib/pages/invite-people-page.js';
import NoticesComponent from '../../lib/components/notices-component.js';

import * as dataHelper from '../../lib/data-helper.js';
import * as driverManager from '../../lib/driver-manager.js';
import EmailClient from '../../lib/email-client.js';

const mochaTimeOut = config.get( 'mochaTimeoutMS' );
const startBrowserTimeoutMS = config.get( 'startBrowserTimeoutMS' );
const inviteInboxId = config.get( 'inviteInboxId' );
const screenSize = driverManager.currentScreenSize();
const host = dataHelper.getJetpackHost();
const emailClient = new EmailClient( inviteInboxId );

describe( `[${ host }] Invites:  (${ screenSize })`, function () {
	this.timeout( mochaTimeOut );
	let driver;

	before( 'Start browser', async function () {
		this.timeout( startBrowserTimeoutMS );
		driver = await driverManager.startBrowser();
	} );

	describe( 'Inviting new user as an Editor and revoke invite: @parallel @jetpack', function () {
		const newUserName = 'e2eflowtestingeditorb' + new Date().getTime().toString();
		const newInviteEmailAddress = dataHelper.getEmailAddress( newUserName, inviteInboxId );
		let acceptInviteURL = '';

		it( 'Can log in and navigate to Invite People page', async function () {
			await new LoginFlow( driver ).loginAndSelectPeople();
			const peoplePage = await PeoplePage.Expect( driver );
			return await peoplePage.inviteUser();
		} );

		it( 'Can Invite a New User as an Editor, then revoke the invite', async function () {
			const invitePeoplePage = await InvitePeoplePage.Expect( driver );
			await invitePeoplePage.inviteNewUser(
				newInviteEmailAddress,
				'editor',
				'Automated e2e testing'
			);
			const noticesComponent = await NoticesComponent.Expect( driver );
			await noticesComponent.isSuccessNoticeDisplayed();
			await invitePeoplePage.backToPeopleMenu();

			const peoplePage = await PeoplePage.Expect( driver );
			await peoplePage.selectInvites();
			await peoplePage.waitForPendingInviteDisplayedFor( newInviteEmailAddress );

			await peoplePage.goToRevokeInvitePage( newInviteEmailAddress );

			const revokePage = await RevokePage.Expect( driver );
			await revokePage.revokeUser();
			const sent = await noticesComponent.isSuccessNoticeDisplayed();
			return assert( sent, 'The sent confirmation message was not displayed' );
		} );

		it( 'Can see an invitation email received for the invite', async function () {
			const emails = await emailClient.pollEmailsByRecipient( newInviteEmailAddress );
			const links = emails[ 0 ].html.links;
			const link = links.find( ( l ) => l.href.includes( 'accept-invite' ) );
			acceptInviteURL = dataHelper.adjustInviteLinkToCorrectEnvironment( link.href );
			return assert.notEqual(
				acceptInviteURL,
				'',
				'Could not locate the accept invite URL in the invite email'
			);
		} );

		it( 'Can open the invite page and see it has been revoked', async function () {
			await driverManager.ensureNotLoggedIn( driver );

			await driver.get( acceptInviteURL );
			await AcceptInvitePage.Expect( driver );

			const inviteErrorPage = await InviteErrorPage.Expect( driver );
			const displayed = await inviteErrorPage.inviteErrorTitleDisplayed();
			return assert( displayed, 'The invite was not successfully revoked' );
		} );
	} );
} );
