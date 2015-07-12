/*jshint laxcomma: true, smarttabs: true, node:true */
'use strict';
/**
 * A Resource for interacting with the Mongoose ODM for mongodb
 * @module tastypie-mongo/lib/resource
 * @author Eric Satterwhite
 * @since 0.1.0
 * @requires util
 * @requires joi
 * @requires qs
 * @requires mout/object
 * @requires mout/lang/toArray
 * @requires mout/lang/isFunction
 * @requires mout/lang/isPrimitive
 * @requires mout/lang/isNumber
 * @requires mout/string/typecast
 * @requires mout/array/map
 * @requires mout/object/set
 * @requires mout/object/merge
 * @requires tastypie/lib/class
 * @requires tastypie/lib/class/options
 * @requires tastypie/lib/resource
 * @requires tastypie/lib/http
 */

var util        = require( 'util' )
  , Class       = require( 'tastypie/lib/class' )
  , Options     = require( 'tastypie/lib/class/options' )
  , http        = require( 'tastypie/lib/http' )
  , object      = require( 'mout/object' )
  , joi         = require( 'joi' )
  , qs          = require( 'qs' )
  , Boom        = require( 'boom' )
  , Resource    = require( 'tastypie/lib/resource' )
  , toArray     = require( 'mout/lang/toArray' )
  , isFunction  = require( 'mout/lang/isFunction' )
  , isPrimitive = require( 'mout/lang/isPrimitive' )
  , isNumber    = require( 'mout/lang/isNumber' )
  , typecast    = require( 'mout/string/typecast' )
  , compact     = require( 'mout/array/map' )
  , set         = require( 'mout/object/set' )
  , merge       = require( 'mout/object/merge' )
  , debug       = require( 'debug' )( 'tastpie:resource:mongoose' )
  , constants   = require( '../constants' )
  , ALL         = require( 'tastypie/lib/constants' ).ALL
  , orderExp    = /^(\-)?([\w]+)/
  , SEP         = '__'
  , MongoResource
  ;


/**
 * @constructor
 * @alias module:tastypie-mongo/lib/resource
 * @extends module:tastypie/lib/resource
 * @mixes module:tastypie/lib/class/options
 * @param {Object} options
 */
module.exports = MongoResource = new Class({
	inherits:Resource
	,options:{
		queryset: null
		,pk:'_id'
		,objectTpl:null
		,max:1000
	}

	,constructor: function( options ){
		var instance;

		this.parent( 'constructor', options );
		joi.assert(this.options.queryset, joi.required(),'tastypie.resource: querset is required')

		instance = new this.options.queryset;
		this.options.objectTpl = this.options.objectTpl || instance.model;
		var paths = Object.keys( this.fields || instance.model.schema.paths );

		this.allowablepaths = paths.filter( function( p ){
			return ( p !== '_id' && p !== '__v');
		});

		instance = null;

	}
	, get_list: function get_list( bundle ){
		var query = new this.options.queryset()
		   , filters
		   ;

		try{
			filters = this.buildFilters( bundle.req.query )
		} catch( err ){
			err.req = bundle.req;
			err.res = bundle.res;
			throw err;
		}

		query.model.count(filters,function(err, cnt ){
			query.where( filters );
			try{
				this.offset( query, bundle );
				this.limit( query, bundle );
				this.sort( query, bundle.req.query );
			} catch ( err ){
				err.req = bundle.req;
				err.res = bundle.res;
				throw err;
			}

			query.exec(function( e, objects ){
				var that = this
				  , paginator
				  , to_be_serialized
				  ;

				objects = objects || [];
				paginator = new this.options.paginator({
					limit:bundle.req.query.limit
					,req:bundle.req
					,res:bundle.res
					,collectionName:this.options.collection
					,objects:objects
					,count: cnt
					,offset: bundle.req.query.offset || 0
				});

				to_be_serialized = paginator.page();
				to_be_serialized[ that.options.collection ] = to_be_serialized[ that.options.collection ].map( function( item ){
					return that.full_dehydrate( item, bundle );
				});

				bundle.data = to_be_serialized;
				to_be_serialized = paginator = null;
				return that.respond( bundle );
			}.bind( this ));
		}.bind( this ))
	}


	,limit: function limit( query, bundle ){
		var qstring = bundle.req.query
		  , lmt
		  ;

		qstring.limit = qstring.hasOwnProperty( 'limit' )  ? parseInt( qstring.limit, 10) : qstring.limit;
		lmt = isNumber( qstring.limit ) ? qstring.limit ? qstring.limit : this.options.max : this.options.limit ? this.options.limit : 25;
		lmt = Math.min( lmt, this.options.max );
		query.limit( lmt );
		return lmt;
	}

	,offset: function offset( query, bundle ){
		var qstring = bundle.req.query;
		query.skip( qstring.offset || 0 )

	}
	,get_object: function get_object( bundle, callback ){
		var req= bundle.req
		var query = new this.options.queryset()
			query
				.model
				.findById( req.params.pk )
				.exec( callback )
	}

	, update_object: function update_object( bundle, callback ){
      var format = this.format( bundle, this.options.serializer.types );
  		var that = this;
		this.get_object( bundle, function( err, obj ){
		if( err || !obj ){
			if( err ){
				err.req = bundle.req;
				err.res = bundle.res;
				return this.emit('error',err);
			}

			bundle.data = {message:'not found',code:404};
			return that.respond(bundle,http.notFound );
		}


		this.deserialize( bundle.data, format, function( err, data ){
				bundle = that.bundle(bundle.req, bundle.res, data )
				merge(obj, data);
				bundle.object = obj;

				bundle = that.full_hydrate( bundle );
				bundle.object.save(function(err, d ){
					return callback && callback( err, bundle );
				});
			});
		}.bind(this));

	}

	, delete_detail: function delete_detail( bundle ){
		var that = this;
		this._delete_detail(bundle, function( err, instance ){
			if( err ){
				err.req = bundle.req
				err.res = bundle.res
				return that.emit('error', err  )
			}

			if( !instance ){
				bundle.data = {message:'not found',code:404};
				return that.respond(bundle,http.notFound );
			}

			if(!that.options.returnData ){
				bundle.data = null;
				var response = http.noContent
				return that.respond( bundle, response )
			}

			bundle.object = instance;
			bundle.data = that.full_dehydrate( bundle.object, bundle );
			that.options.cache.set(bundle.toKey( 'detail') , null )
			return that.respond( bundle )
		});
	}

	, _delete_detail: function _delete_detail( bundle, callback ){
		var query = new this.options.queryset();
		query = query.model.findByIdAndRemove(bundle.req.params.pk);
		query.exec(callback);
		return this;
	}
	, _post_list: function( bundle, callback ){
		var format = this.format( bundle, this.options.serializer.types );
		var that = this;
		this.deserialize( bundle.data, format, function( err, data ){
			bundle = that.bundle(bundle.req, bundle.res, data )
			var obj = new that.options.objectTpl()
			merge(obj, data)
			bundle.object = obj

			bundle = that.full_hydrate( bundle )

			bundle.object.save(function(err, d ){
				return callback && callback( err, bundle )
			})
		})
	}

	,buildFilters: function buildFilters( qstring ){
		var remaining = {};
		var query = qs.parse( qstring );
		var filters = this.options.filtering || {};
		var fieldmap = this.fields;
		
		for( var key in query ){
			var bits = key.split('__')
				 , filter = {}
				 , filtername = 'exact'
				 , bitlength
				 , value
				 , fieldname
				 , filtertype
				 , attr
				 ;


			value      = query[key];
			fieldname  = bits.shift();
			bitlength  = bits.length - 1;
			filtername = bits[ bitlength ] || filtername
			filtertype = constants.terms[ filtername ] ? constants.terms[bits.pop()] : filtername;
			// exact isn't really a filter...
			if(filtername == 'exact' || filters[fieldname] === ALL || !fieldmap[fieldname] ) {
				// pass
			} else if( !filters[ fieldname ] ){
				var e  = Boom.create(400,"filtering on " + fieldname + " is not allowed");
				throw e
			} else if( ( filters[fieldname] || []).indexOf( filtername ) == -1 ){
				var e   = Boom.create(400, filtername + " filter is not allowed on field " + fieldname );
				throw e
			}

			// should be defined on resource instance
			attr      = fieldmap[ fieldname ] ? fieldmap[fieldname].options.attribute || fieldname : fieldname
			fieldname = bits.unshift( attr ) && bits.join('.');
		
			if( this.allowablepaths.indexOf( fieldname ) >=0 ){
				remaining[fieldname] = remaining[fieldname] || {};
				filter = isFunction( filtertype.value ) ? filtertype.value( value ) : typecast( value ) ;
				remaining[ fieldname ] = isPrimitive( filter ) ? filter : merge( remaining[ fieldname ], filter );
			}
		}
		return remaining;
	}

	, sort: function sort( mquery, rquery ){
		var ordering = {};
		var allowed = this.options.ordering || [];
		var that = this;
		
		toArray( rquery.orderby ).forEach( function( param ){
			var bits = orderExp.exec( param );

			if( !bits ){
				return;
			}else if( bits[2] == 1 || allowed.indexOf( bits[2] ) == -1 ){
				var e = Boom.create(400, "Invalid sort parameter: " + bits[2]);
				return that.emit('error', e );
			}
			ordering[ bits[2] ] = bits[1] ? -1 : 1;
		});

		mquery.sort( ordering );
		return mquery;
	}
});

MongoResource.extend = function( proto ){
	proto.inherits = MongoResource;
	return new Class( proto )
}
