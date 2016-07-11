/*globals module,process,require,exports,__dirname,__filename */
/*jshint laxcomma: true, smarttabs: true, node:true, esnext: true*/
'use strict';
/**
 * @module tastypie-mongoose/lib/filters/regex
 * @author Eric Satterwhite
 * @since 2.0.0
 * @xample field__regex=(foo|bar)
 */

/**
 * mongoose field filter literal regular expression lookup
 * @param {Number} value A value to compare against
 * @return {Object} A mongo filter object
 **/
module.exports = function( term ){ 
	return {'$regex' : term };
};
