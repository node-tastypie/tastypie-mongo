/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/ne
 * @author Eric Satterwhite
 * @since 2.0.0
 */

/**
 * mongoose field filter to match documents where the field value does **NOT** match the specified input
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$ne' : term };
};
