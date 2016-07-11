/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/match
 * @author Eric Satterwhite
 * @since 2.0.0
 * @example ?field__match=1
 */

/**
 *  matches documents that contain an array field with at least one element that matches all the specified query criteria
 * @param {Number|String|Boolean} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$elemMatch' : term }; 
};
