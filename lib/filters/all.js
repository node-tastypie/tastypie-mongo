/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/all
 * @author Eric Satterwhite
 * @since 2.0.0
 * @requires mout/lang/toArray
 * @xample ?field__all=foo&field__all=bar&field__all=baz // {$all:['foo','bar','baz']}
 */
const toArray = require('mout/lang/toArray')
/**
 * selects the documents where the value of a field is an array that contains all the specified elements
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$all' : toArray(term) };
};
