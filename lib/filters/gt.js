/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/gt
 * @author Eric Satterwhite
 * @since 2.0.0
 * @example ?field__gt=1
 */

/**
 * mongoose field filter for values greater than the specified input
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$gt' : term }; 
};
