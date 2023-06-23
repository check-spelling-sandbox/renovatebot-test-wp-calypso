import { recordTracksEvent } from '@automattic/calypso-analytics';
import { Gridicon } from '@automattic/components';
import { Reader, SubscriptionManager } from '@automattic/data-stores';
import { useTranslate } from 'i18n-calypso';
import { useMemo } from 'react';
import { connect, useDispatch } from 'react-redux';
import TimeSince from 'calypso/components/time-since';
import { successNotice } from 'calypso/state/notices/actions';
import { Link } from '../link';
import { SiteSettingsPopover } from '../settings';
import { SiteIcon } from '../site-icon';
import {
	useSubscriptionManagerContext,
	ReaderPortal,
	SubscriptionsPortal,
} from '../subscription-manager-context';

const useDeliveryFrequencyLabel = ( deliveryFrequencyValue?: Reader.EmailDeliveryFrequency ) => {
	const translate = useTranslate();

	const deliveryFrequencyLabels = useMemo(
		() => ( {
			daily: translate( 'Daily' ),
			weekly: translate( 'Weekly' ),
			instantly: translate( 'Instantly' ),
		} ),
		[ translate ]
	);

	return (
		deliveryFrequencyLabels[ deliveryFrequencyValue as Reader.EmailDeliveryFrequency ] ??
		translate( 'Paused' )
	);
};

const RedCross = () => <Gridicon icon="cross" size={ 16 } className="red" />;

const GreenCheck = () => <Gridicon icon="checkmark" size={ 16 } className="green" />;

const SelectedNewPostDeliveryMethods = ( {
	isEmailMeNewPostsSelected,
	isNotifyMeOfNewPostsSelected,
}: {
	isEmailMeNewPostsSelected: boolean;
	isNotifyMeOfNewPostsSelected: boolean;
} ) => {
	const translate = useTranslate();

	if ( ! isEmailMeNewPostsSelected && ! isNotifyMeOfNewPostsSelected ) {
		return <RedCross />;
	}

	const emailDelivery = isEmailMeNewPostsSelected ? translate( 'Email' ) : null;
	const notificationDelivery = isNotifyMeOfNewPostsSelected ? translate( 'Notifications' ) : null;
	const selectedNewPostDeliveryMethods = [ emailDelivery, notificationDelivery ]
		.filter( Boolean )
		.join( ', ' );
	return <>{ selectedNewPostDeliveryMethods }</>;
};

type SiteRowProps = Reader.SiteSubscription & {
	successNotice: typeof successNotice;
};

const SiteRow = ( {
	blog_ID,
	feed_ID,
	name,
	site_icon,
	URL: url,
	date_subscribed,
	delivery_methods,
	is_wpforteams_site,
	is_paid_subscription,
	isDeleted,
	successNotice,
}: SiteRowProps ) => {
	const translate = useTranslate();
	const dispatch = useDispatch();

	const hostname = useMemo( () => {
		try {
			return new URL( url ).hostname;
		} catch ( e ) {
			return '';
		}
	}, [ url ] );
	const { isLoggedIn } = SubscriptionManager.useIsLoggedIn();
	const deliveryFrequencyLabel = useDeliveryFrequencyLabel(
		delivery_methods.email?.post_delivery_frequency
	);
	const { mutate: updateNotifyMeOfNewPosts, isLoading: updatingNotifyMeOfNewPosts } =
		SubscriptionManager.useSiteNotifyMeOfNewPostsMutation();
	const { mutate: updateEmailMeNewPosts, isLoading: updatingEmailMeNewPosts } =
		SubscriptionManager.useSiteEmailMeNewPostsMutation();
	const { mutate: updateDeliveryFrequency, isLoading: updatingFrequency } =
		SubscriptionManager.useSiteDeliveryFrequencyMutation();
	const { mutate: updateEmailMeNewComments, isLoading: updatingEmailMeNewComments } =
		SubscriptionManager.useSiteEmailMeNewCommentsMutation();
	const { mutate: unsubscribe, isLoading: unsubscribing } =
		SubscriptionManager.useSiteUnsubscribeMutation();
	const { mutate: resubscribe } = SubscriptionManager.useSiteSubscribeMutation();

	const unsubscribeSuccessCallback = () => {
		dispatch(
			successNotice(
				translate( 'You have successfully unsubscribed from %(name)s.', { args: { name } } ),
				{
					duration: 5000,
					button: translate( 'Resubscribe' ),
					onClick: () =>
						resubscribe( { blog_id: blog_ID, url, doNotInvalidateSiteSubscriptions: true } ),
				}
			)
		);
	};

	const { portal } = useSubscriptionManagerContext();

	const siteTitleUrl = useMemo( () => {
		if ( portal === ReaderPortal ) {
			return `/read/feeds/${ feed_ID }`;
		}

		if ( portal === SubscriptionsPortal ) {
			return `/subscriptions/site/${ blog_ID }`;
		}
	}, [ blog_ID, feed_ID, portal ] );

	const handleNotifyMeOfNewPostsChange = ( send_posts: boolean ) => {
		// Update post notification settings
		updateNotifyMeOfNewPosts( { blog_id: blog_ID, send_posts } );

		// Record tracks event
		const tracksProperties = { blog_id: blog_ID, portal };
		if ( send_posts ) {
			recordTracksEvent( 'calypso_subscriptions_notifications_toggle_on', tracksProperties );
		} else {
			recordTracksEvent( 'calypso_subscriptions_notifications_toggle_off', tracksProperties );
		}
	};

	const handleEmailMeNewPostsChange = ( send_posts: boolean ) => {
		// Update post emails settings
		updateEmailMeNewPosts( { blog_id: blog_ID, send_posts } );

		// Record tracks event
		const tracksProperties = { blog_id: blog_ID, portal };
		if ( send_posts ) {
			recordTracksEvent( 'calypso_subscriptions_post_emails_toggle_on', tracksProperties );
		} else {
			recordTracksEvent( 'calypso_subscriptions_post_emails_toggle_off', tracksProperties );
		}
	};

	const handleEmailMeNewCommentsChange = ( send_comments: boolean ) => {
		// Update comment emails settings
		updateEmailMeNewComments( { blog_id: blog_ID, send_comments } );

		// Record tracks event
		const tracksProperties = { blog_id: blog_ID, portal };
		if ( send_comments ) {
			recordTracksEvent( 'calypso_subscriptions_comment_emails_toggle_on', tracksProperties );
		} else {
			recordTracksEvent( 'calypso_subscriptions_comment_emails_toggle_off', tracksProperties );
		}
	};

	const handleDeliveryFrequencyChange = ( delivery_frequency: Reader.EmailDeliveryFrequency ) => {
		// Update post emails delivery frequency
		updateDeliveryFrequency( { blog_id: blog_ID, delivery_frequency } );

		// Record tracks event
		const tracksProperties = { blog_id: blog_ID, delivery_frequency, portal };
		recordTracksEvent( 'calypso_subscriptions_post_emails_set_frequency', tracksProperties );
	};

	return ! isDeleted ? (
		<li className="row" role="row">
			<span className="title-cell" role="cell">
				<Link className="title-icon" href={ siteTitleUrl }>
					<SiteIcon iconUrl={ site_icon } size={ 40 } siteName={ name } />
				</Link>
				<span className="title-column">
					<Link className="title-name" href={ siteTitleUrl }>
						{ name }
						{ !! is_wpforteams_site && <span className="p2-label">P2</span> }
						{ !! is_paid_subscription && (
							<span className="paid-label">
								{ translate( 'Paid', { context: 'Label for a paid subscription plan' } ) }
							</span>
						) }
					</Link>
					<a
						className="title-url"
						{ ...( url && { href: url } ) }
						rel="noreferrer noopener"
						target="_blank"
					>
						{ hostname }
					</a>
				</span>
			</span>
			<span className="date-cell" role="cell">
				<TimeSince
					date={
						( date_subscribed.valueOf() ? date_subscribed : new Date( 0 ) ).toISOString?.() ??
						date_subscribed
					}
				/>
			</span>
			{ isLoggedIn && (
				<span className="new-posts-cell" role="cell">
					<SelectedNewPostDeliveryMethods
						isEmailMeNewPostsSelected={ !! delivery_methods.email?.send_posts }
						isNotifyMeOfNewPostsSelected={ !! delivery_methods.notification?.send_posts }
					/>
				</span>
			) }
			{ isLoggedIn && (
				<span className="new-comments-cell" role="cell">
					{ delivery_methods.email?.send_comments ? <GreenCheck /> : <RedCross /> }
				</span>
			) }
			<span className="email-frequency-cell" role="cell">
				{ deliveryFrequencyLabel }
			</span>
			<span className="actions-cell" role="cell">
				<SiteSettingsPopover
					// NotifyMeOfNewPosts
					notifyMeOfNewPosts={ !! delivery_methods.notification?.send_posts }
					onNotifyMeOfNewPostsChange={ handleNotifyMeOfNewPostsChange }
					updatingNotifyMeOfNewPosts={ updatingNotifyMeOfNewPosts }
					// EmailMeNewPosts
					emailMeNewPosts={ !! delivery_methods.email?.send_posts }
					updatingEmailMeNewPosts={ updatingEmailMeNewPosts }
					onEmailMeNewPostsChange={ handleEmailMeNewPostsChange }
					// DeliveryFrequency
					deliveryFrequency={
						delivery_methods.email?.post_delivery_frequency ??
						Reader.EmailDeliveryFrequency.Instantly
					}
					onDeliveryFrequencyChange={ handleDeliveryFrequencyChange }
					updatingFrequency={ updatingFrequency }
					// EmailMeNewComments
					emailMeNewComments={ !! delivery_methods.email?.send_comments }
					onEmailMeNewCommentsChange={ handleEmailMeNewCommentsChange }
					updatingEmailMeNewComments={ updatingEmailMeNewComments }
					onUnsubscribe={ () =>
						unsubscribe(
							{ blog_id: blog_ID, url, doNotInvalidateSiteSubscriptions: true },
							{ onSuccess: unsubscribeSuccessCallback }
						)
					}
					unsubscribing={ unsubscribing }
				/>
			</span>
		</li>
	) : null;
};

export default connect( null, { successNotice } )( SiteRow );
