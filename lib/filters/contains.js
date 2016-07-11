/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/contains
 * @author Eric Satterwhite
 * @since 2.0.0
 * @example ?field__contains='aer'
 */

/**
 * Matches documents where the field value contains the specified string anywhere in the target value in a case sensitive manner
 * @param {String} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$regex': new RegExp( term )}; 
};
