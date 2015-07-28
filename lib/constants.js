/*jshint laxcomma: true, smarttabs: true, node: true*/
'use strict';
/**
 * Static shared data and functions
 * @module tastypie-mongo/lib/constants
 * @author Eric Satterwhite
 * @since 0.1.0
 */


/**
 * @readonly
 * @name terms
 * @memberof module:tastypie-mongo/lib/constants
 * @property terms {Object} Defines querystring filter types
 * @property terms.gt Greater Than Filter type
 * @property terms.gte Greater Than or Equal To Filter Type
 * @property terms.in In Filter type for array value lookups
 * @property terms.lt Less Than filter Type
 * @property terms.lte Less Than or Equal To filter type
 * @property terms.ne Not Equal To filter type
 * @property terms.nin Non-In Filter type. The inverse of what `in` does
 * @property terms.regex literal regular expression lookup
 * @property terms.all Match agains all values in an array field
 * @property terms.size Array length filter type
 * @property terms.iexact Case in-sensitive filter type for exact string matches
 * @property terms.contains Contains filter type for string matching
 * @property terms.icontains case insensitive version of `Contains`
 * @property terms.startswith Starts with filter type for string matching
 * @property terms.istartswith Case insensitive version of `startswith`
 * @property terms.endswith Ends with filter type for string matching
 * @property terms.iendswith Case insensitive version of `endswith`
 */
exports.terms = {
	'gt'            : { value: function( term ){ return {'$gt'       : term}; } }
	, 'gte'         : { value: function( term ){ return {'$gte'      : term}; } }
	, 'in'          : { value: function( term ){ return {'$in'       : term}; } }
	, 'lt'          : { value: function( term ){ return {'$lt'       : term}; } }
	, 'lte'         : { value: function( term ){ return {'$lte'      : term}; } }
	, 'ne'          : { value: function( term ){ return {'$ne'       : term}; } }
	, 'nin'         : { value: function( term ){ return {'$nin'      : term}; } }
	, 'regex'       : { value: function( term ){ return {'$regex'    : term}; } }
	, 'all'         : { value: function( term ){ return {'$all'      : term}; } }
	, 'size'        : { value: function( term ){ return {'$size'     : term}; } }
	, 'match'       : { value: function( term ){ return {'$elemMatch': term}; } }
	, 'iexact'      : { value: function( term ){ return {'$regex'    : new RegExp( term, 'i' ) };  } }
	, 'contains'    : { value: function( term ){ return {'$regex'    : new RegExp( term )};  } }
	, 'icontains'   : { value: function( term ){ return {'$regex'    : new RegExp(term, 'i')};  } }
	, 'startswith'  : { value: function( term ){ return {'$regex'    : new RegExp( '^' + term ) };  } }
	, 'istartswith' : { value: function( term ){ return {'$regex'    : new RegExp( '^' + term, 'i' )};  } }
	, 'endswith'    : { value: function( term ){ return {'$regex'    : new RegExp( term + '$' ) };  } }
	, 'iendswith'   : { value: function( term ){ return {'$regex'    : new RegExp( term + '$', 'i') };  } }
};
