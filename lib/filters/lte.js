/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/lte
 * @author Eric Satterwhite
 * @since 2.0.0
 */

/**
 * mongoose field filter for values less than or equal tothe specified input
 * @param {Number|String|Boolean} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$lte' : term };
};
