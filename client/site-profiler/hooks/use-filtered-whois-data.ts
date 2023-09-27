import { useMemo } from 'react';
import { WhoIs } from 'calypso/data/site-profiler/types';

interface FilteredWhois {
	[ name: string ]: boolean;
}

export interface FilteredWhoisData {
	fieldsRedacted: number;
	filteredWhois: FilteredWhois;
}

export const useFilteredWhoisData = ( whois: WhoIs ): FilteredWhoisData => {
	return useMemo( (): FilteredWhoisData => {
		let fieldsRedacted = 0;
		const redactedFields = [ 'redactedforprivacy' ];
		const filteredWhois: FilteredWhois = {};

		// Check if there are redacted whois fields
		for ( const key in whois ) {
			let value = whois[ key as keyof WhoIs ] ?? '';

			if ( Array.isArray( value ) ) {
				value = value.length > 0 ? value[ 0 ] : '';
			}

			value = value?.toLowerCase().replace( /[ .]/g, '' );
			const isRedacted = redactedFields.includes( value );

			if ( isRedacted ) {
				++fieldsRedacted;
			}

			filteredWhois[ key ] = ! isRedacted;
		}

		return { filteredWhois, fieldsRedacted };
	}, [ whois ] );
};
