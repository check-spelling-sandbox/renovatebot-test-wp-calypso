/* eslint-disable no-console, import/no-nodejs-modules */
const { createWriteStream } = require( 'fs' );
const { mkdir } = require( 'fs/promises' );
const path = require( 'path' );
const { _electron: electron } = require( 'playwright' );

let APP_PATH;

switch ( process.platform ) {
	case 'linux':
		APP_PATH = path.join( __dirname, '../../../release/linux-unpacked/wpcom' );
		break;
	case 'darwin':
		// On Apple Silicon, the output file is under a separate directory.
		if ( process.arch.includes( 'arm' ) ) {
			APP_PATH = path.join(
				__dirname,
				'../../../release/mac-arm64/WordPress.com.app/Contents/MacOS/WordPress.com'
			);
			break;
		}
		// Codepath for Intel architecture.
		APP_PATH = path.join(
			__dirname,
			'../../../release/mac/WordPress.com.app/Contents/MacOS/WordPress.com'
		);
		break;
	default:
		throw new Error( 'unsupported platform' );
}

const CONSOLE_PATH = path.join( __dirname, '../results/console.log' );
const SCREENSHOT_PATH = path.join( __dirname, '../results/screenshot.png' );
const HAR_PATH = path.join( __dirname, '../results/network.har' );
const WP_DEBUG_LOG = path.resolve( __dirname, '../results/app.log' );

const BASE_URL = process.env.WP_DESKTOP_BASE_URL?.replace( /\/$/, '' ) ?? 'https://wordpress.com';

describe( 'User Can log in', () => {
	jest.setTimeout( 60000 );

	let window;
	let electronApp;
	let consoleStream;

	beforeAll( async () => {
		await mkdir( path.dirname( CONSOLE_PATH ), { recursive: true } );
		consoleStream = createWriteStream( CONSOLE_PATH );

		electronApp = await electron.launch( {
			executablePath: APP_PATH,
			args: [ '--disable-http-cache', '--start-maximized' ],
			timeout: 0,
			recordHar: {
				path: HAR_PATH,
			},
			recordVideo: {
				dir: SCREENSHOT_PATH + '/screen_record',
			},
			env: {
				...process.env,
				WP_DESKTOP_BASE_URL: BASE_URL,
				WP_DEBUG_LOG, // This will override logging path from the Electron main process.
				// Ensure other CI-specific overrides (such as disabling the auto-updater)
				DEBUG: 'pw:api',
				CI: true,
			},
		} );

		// Find main window. Playwright has problems identifying the main window
		// when using `firstWindow`, so we find it by URL.
		window = electronApp.windows().find( ( w ) => w.url().startsWith( BASE_URL ) );

		if ( ! window ) {
			window = await electronApp.firstWindow();
		}

		// Capture console
		window.on( 'console', ( data ) =>
			consoleStream.write( `${ new Date().toUTCString() } [${ data.type() }] ${ data.text() }\n` )
		);
	} );

	// eslint-disable-next-line jest/expect-expect
	it( 'Log in', async () => {
		await window.screenshot( { path: SCREENSHOT_PATH } );

		await window.getByLabel( 'Email Address or Username' ).fill( process.env.E2EGUTENBERGUSER );
		await window.screenshot( { path: SCREENSHOT_PATH } );

		await window.getByRole( 'button', { name: 'Continue' } ).click();
		await window.screenshot( { path: SCREENSHOT_PATH } );

		await window.getByLabel( 'Password' ).fill( process.env.E2EPASSWORD );
		await window.screenshot( { path: SCREENSHOT_PATH } );

		const responsePromise = window.waitForResponse( '**/wp-login.php?action=login-endpoint' );
		await window.getByRole( 'button', { name: 'Log In' } ).click();

		// If the account credentials are rejected, throw an error containing the text of
		// the validation error.
		// Credentaials can be rejected for any number of reasons:
		// 	- closed account
		//	- wrong password
		const response = await responsePromise;
		if ( response.status() === 400 ) {
			throw new Error( await window.getByRole( 'alert' ).innerText() );
		}

		expect( response.status() ).toBe( 200 );
	} );

	afterAll( async () => {
		if ( consoleStream ) {
			consoleStream.end();
		}

		if ( window ) {
			await window.screenshot( { path: SCREENSHOT_PATH } );
		}

		if ( electronApp ) {
			try {
				await electronApp.close();
			} catch {}
		}
	} );
} );
