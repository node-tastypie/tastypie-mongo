/*jshint laxcomma: true, smarttabs: true, node:true, unused: true */
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

var Class       = require( 'tastypie/lib/class' )
  , http        = require( 'tastypie/lib/http' )
  , joi         = require( 'joi' )
  , qs          = require( 'qs' )
  , Boom        = require( 'boom' )
  , async       = require( 'async' )
  , Resource    = require( 'tastypie/lib/resource' )
  , Paginator   = require('tastypie/lib/paginator')
  , toArray     = require( 'mout/lang/toArray' )
  , isFunction  = require( 'mout/lang/isFunction' )
  , isPrimitive = require( 'mout/lang/isPrimitive' )
  , isNumber    = require( 'mout/lang/isNumber' )
  , typecast    = require( 'mout/string/typecast' )
  , merge       = require( 'mout/object/merge' )
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
		,paginator: Paginator.Remote
		,max:1000
	}

	,constructor: function( options ){
		var instance;

		this.parent( 'constructor', options );
		joi.assert(this.options.queryset, joi.required(),'tastypie.resource: querset is required');

		instance = new this.options.queryset();
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
		   , collectionName = this.options.collection
		   , that = this
		   ;

		try{
			filters = this.buildFilters( bundle.req.query );
		} catch( err ){
			err.req = bundle.req;
			err.res = bundle.res;
			throw err;
		}

		query.model.count(filters,function(err, cnt ){
			query.where( filters );
			try{
				that.offset( query, bundle );
				that.limit( query, bundle );
				that.sort( query, bundle.req.query );
			} catch ( err ){
				err.req = bundle.req;
				err.res = bundle.res;
				throw err;
			}

			query.exec(function( e, objects ){
				var paginator
				  , to_be_serialized
				  ;

				
				paginator = new that.options.paginator({
					limit:bundle.req.query.limit
					,req:bundle.req
					,res:bundle.res
					,collectionName:collectionName
					,objects:objects
					,count: cnt
					,offset: bundle.req.query.offset || 0
				});

				to_be_serialized = paginator.page();

				async.map( to_be_serialized[ that.options.collection ],function( item, done ){
					that.full_dehydrate( item, bundle, done );
				}, function( err, results ){
					to_be_serialized[ that.options.collection ] = results;
					bundle.data = to_be_serialized;
					to_be_serialized = paginator = null;
					return that.respond( bundle );
				});

			});
		});
	}

	,limit: function limit( query, bundle ){
		var qstring = bundle.req.query
		  , lmt
		  ;

		qstring.limit = qstring.hasOwnProperty( 'limit' )  ? parseInt( qstring.limit, 10) : qstring.limit;
		lmt = typeof qstring.limit === 'number' ? qstring.limit ? qstring.limit : this.options.max : this.options.limit ? this.options.limit : 25;
		lmt = Math.min( lmt, this.options.max );
		query.limit( lmt );
		return lmt;
	}

	,offset: function offset( query, bundle ){
		var qstring = bundle.req.query;
		query.skip( qstring.offset || 0 );

	}
	,get_object: function get_object( bundle, callback ){
		var req= bundle.req;
		var query = new this.options.queryset();
			query
				.model
				.findById( req.params.pk )
				.exec( callback );
	}

	, update_object: function update_object( bundle, callback ){
		var format = this.format( bundle, this.options.serializer.types );
		var that = this;

		this.get_object( bundle, function( err, obj ){
			if( err || !obj ){
				if( err ){
					err.req = bundle.req;
					err.res = bundle.res;
					return that.emit('error',err);
				}

				bundle.data = {message:'not found',code:404};
				return that.respond( bundle, http.notFound );
			}


			that.deserialize( bundle.data, format, function( err, data ){
				bundle.data = data;
				merge(obj, data);
				bundle.object = obj;
				that.full_hydrate( bundle, function( hyd_err, bundle ){
					if( hyd_err ){
						hyd_err.req = bundle.req;
						hyd_err.res = bundle.res;
						throw hyd_err;
					}
					bundle.object.save(function(err){
						return callback && callback( err, bundle );
					});
				});
			});
		});

	}

	, replace_object: function replace_object( bundle, callback ){
		var that   = this
		  , format = this.format( bundle, this.options.serialzier.types )
		  , Model  = this.options.queryset.prototype.model
		  , pk     = bundle.req.params.pk;
		  ;

		  this.deserialize( bundle.data, format, function(err, data){
		  	bundle.data = data
		  	bundle.object = {};
			that.full_hydrate( bundle, function( hyd_err, bundle ){
				if( hyd_err ){
					hyd_err.req = bundle.req;
					hyd_err.res = bundle.res;
					throw hyd_err;
				}
			  	Model.update( {_id: pk}, bundle.object ).exec( callback );
			});
		  });
	}

	, delete_detail: function delete_detail( bundle ){
		var that = this;
		this._delete_detail(bundle, function( err, instance ){
			if( err ){
				err.req = bundle.req;
				err.res = bundle.res;
				throw err;
			}

			if( !instance ){
				return that.emit('error', Boom.create( 404, "object with id " + bundle.req.params.pk + "not found") );
			}

			if(!that.options.returnData ){
				bundle.data = null;
				return that.respond( bundle, http.noContent );
			}

			bundle.object = instance;
			that.full_dehydrate( bundle.object, bundle, function( err, data ){
				bundle.data = data;
				that.options.cache.set(bundle.toKey( 'detail') , null );
				that.respond( bundle );
			});
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
			bundle = that.bundle(bundle.req, bundle.res, data );
			var obj = new that.options.objectTpl();
			merge(obj, data);
			bundle.object = obj;
			that.full_hydrate( bundle, function( hyd_err, bundle ){
				bundle.object.save(function(err){
					return callback && callback( err, bundle );
				});
			});

		});
	}

	,buildFilters: function buildFilters( qstring ){
		var remaining
		  , query
		  , filters
		  , fieldmap
		  , err
		  , bits 
		  , filter
		  , filtername
		  , bitlength
		  , value
		  , fieldname
		  , filtertype
		  , attr
		  ;
		
	    filter     = {};
	    filtername = 'exact';
		remaining  = {};
		query      = qs.parse( qstring );
		filters    = this.options.filtering || {};
		fieldmap   = this.fields;

		for( var key in query ){
		    bits       = key.split( SEP );
			value      = query[key];
			fieldname  = bits.shift();
			bitlength  = bits.length - 1;
			filtername = bits[ bitlength ] || filtername;
			filtertype = constants.terms[ filtername ] ? constants.terms[bits.pop()] : filtername;


			// if the field allows all or it is a field we don't know about
			if( filters[fieldname] === ALL || !fieldmap[fieldname] ) {
				// pass
			} else if( !filters[ fieldname ] ){
				 err = Boom.create(400,"filtering on " + fieldname + " is not allowed");
				throw err;
			} else if( ( filters[fieldname] || []).indexOf( filtername ) == -1 ){
				err = Boom.create(400, filtername + " filter is not allowed on field " + fieldname );
				throw err;
			}

			// should be defined on resource instance
			attr      = fieldmap[ fieldname ] ? fieldmap[fieldname].options.attribute || fieldname : fieldname;
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
	return new Class( proto );
};
