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

var tastypie           = require('tastypie')
  , joi                = require( 'joi' )
  , qs                 = require( 'qs' )
  , Boom               = require( 'boom' )
  , async              = require( 'async' )
  , toArray            = require( 'mout/lang/toArray' )
  , isFunction         = require( 'mout/lang/isFunction' )
  , isPrimitive        = require( 'mout/lang/isPrimitive' )
  , isNumber           = require( 'mout/lang/isNumber' )
  , typecast           = require( 'mout/string/typecast' )
  , merge              = require( 'mout/object/merge' )
  , terms              = require( '../filters' )
  , Class              = tastypie.Class
  , http               = tastypie.http
  , Resource           = tastypie.Resource
  , Paginator          = tastypie.Paginator
  , ALL                = tastypie.constants.ALL
  , ALL_WITH_RELATIONS = tastypie.constants.ALL_WITH_RELATIONS
  , orderExp           = /^(\-)?([\w]+)/
  , SEP                = '__'
  , EMPTY_ARRAY        = []
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


	, buildFilters: function buildFilters( qstring ){
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
			filtertype = terms[ filtername ] ? terms[bits.pop()] : filtername;


			// if the field allows all or it is a field we don't know about
			if( filters[fieldname] === ALL || filters[fieldname] === ALL_WITH_RELATIONS || !fieldmap[fieldname] ) {
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
				filter = isFunction( filtertype ) ? filtertype( value ) : typecast( value ) ;
				remaining[ fieldname ] = isPrimitive( filter ) ? filter : merge( remaining[ fieldname ], filter );
			}
		}

		return remaining;
	}

	, create_object: function create_object( bundle, callback ){
		this.full_hydrate( bundle, function( hyd_err, bundle ){
			bundle.object.save(function(err){
				return callback && callback( err, bundle );
			});
		});
		return this;
	}

	, delete_detail: function delete_detail( bundle ){
		var that = this;
		this.remove_object(bundle, function( err, instance ){
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
			return this.emit('error', err);
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
				return this.emit('error', err);
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

	, get_object: function get_object( bundle, callback ){
		var req= bundle.req;
		var query = new this.options.queryset();
			query
				.model
				.findById( req.params.pk )
				.exec( callback );
	}

	, limit: function limit( query, bundle ){
		var qstring = bundle.req.query
		  , lmt
		  ;

		qstring.limit = qstring.hasOwnProperty( 'limit' )  ? parseInt( qstring.limit, 10) : qstring.limit;
		lmt = typeof qstring.limit === 'number' ? qstring.limit ? qstring.limit : this.options.max : this.options.limit ? this.options.limit : 25;
		lmt = Math.min( lmt, this.options.max );
		query.limit( lmt );
		return lmt;
	}

	, offset: function offset( query, bundle ){
		var qstring = bundle.req.query;
		return query.skip( qstring.offset || 0 );
	}


	, replace_object: function replace_object( bundle, callback ){
		var Model  = this.options.queryset.prototype.model
		  , pk     = bundle.req.params.pk
		  ;

		bundle.object = {};
		this.full_hydrate( bundle, function( hyd_err, bundle ){
			if( hyd_err ){
				hyd_err.req = bundle.req;
				hyd_err.res = bundle.res;
				throw hyd_err;
			}

			let bulk = Model.collection.initializeUnorderedBulkOp();

			bulk.find( {_id: pk} ).replaceOne(  bundle.object );
			bulk.execute(function( err, response ){
				callback( err, bundle );
			});
		});
		return this;
	}



	, remove_object: function remove_object( bundle, callback ){
		new this.options.queryset()
      			.model
      			.findByIdAndRemove(bundle.req.params.pk)
      			.exec(callback);

		return this;
	}



	, sort: function sort( mquery, rquery ){
  		var ordering = {}
  		  , allowed = this.options.ordering || EMPTY_ARRAY
  	      , params = toArray( rquery.orderby )
  		  , bits
  		  , x
  		  , len
  		  ;

  		for( x = 0, len = params.length; x < len; x++){
  			bits = orderExp.exec( params[x] );
  			if( !bits ){
  				return;
  			}else if( bits[2] == 1 || allowed.indexOf( bits[2] ) == -1 ){
  				var e = Boom.create(400, "Invalid sort parameter: " + bits[2]);
  				return that.emit('error', e );
  			}
  			ordering[ bits[2] ] = bits[1] ? -1 : 1;
  		}
  		mquery.sort( ordering );
  		bits, x, len, allowed, ordering = undefined;
  		return mquery;
	}


	, update_object: function update_object( bundle, callback ){
		bundle.object = {};
		this.full_hydrate( bundle, function( hyd_err, bundle ){
			if( hyd_err ){
				hyd_err.req = bundle.req;
				hyd_err.res = bundle.res;
				throw hyd_err;
			}

		new this.options.queryset()
			.model
			.findByIdAndUpdate(
				bundle.req.params.pk
			  , bundle.object
			  , {new:true, upsert:false, runValidators:true}
			)
			.exec(function( err, doc, opts ){
				bundle.object = doc;
				if( err.errors && err.name == 'ValidationError' ){
					let collect = []
					  , original = err.name
					  ;

					for( let error in err.errors ){
						collect.push( err.errors[error].message );
					}

					err = Boom.badData(collect.join('\n'));

				}

				return callback && callback( err, bundle );
			});
		}.bind(this));
	}

});

MongoResource.extend = function( proto ){
	proto.inherits = MongoResource;
	return new Class( proto );
};
