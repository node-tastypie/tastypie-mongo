/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/nin
 * @author Eric Satterwhite
 * @since 2.0.0
 * @requires mout/lang/toArray
 * @example ?field__nin=bar&field__nin=foo // {$nin:['foo','bar'] }
 */
const toArray = require('mout/lang/toArray')

/**
 * mongoose field filter to search for a specified value is **NOT** in an array
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$nin' : toArray(term) };
};
