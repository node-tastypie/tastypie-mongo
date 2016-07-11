/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/gte
 * @author Eric Satterwhite
 * @since 2.0.0
 * @example ?field__gte=1
 */

/**
 * mongoose field filter for values greater than or equal to the specified input
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$gte' : term };
};
