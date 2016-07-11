/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/size
 * @author Eric Satterwhite
 * @since 2.0.0
 * @example ?field__size=1
 */

/**
 * filters documents by the size of an array field value.
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$size' : term }; 
};
