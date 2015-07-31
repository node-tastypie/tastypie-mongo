[ ![Codeship Status for esatterwhite/tastypie-mongo](https://codeship.com/projects/2517df60-0a1f-0133-9779-1e445c7f4e51/status?branch=master)](https://codeship.com/projects/90663)

## node-mongoose

A Tastypie resource for mongoose.

##### Install Mongoose Resource

```js
npm install mongoose tastypie-mongoose
```

##### Make A mongoose Model
```js
// Make A Mongoose Model
var Schema = new mongoose.Schema({ 
	name:{
		first:{type:String}
		,last:{type:String}
	}
	,index:{type:Number, required:false}
	,guid:{type:String, requierd:false}
	,tags:[{type:String}]
}, {collection:'tastypie'})

var Test = connection.model('Test', Schema)
```

##### Define A Resource
```js
var tastypie = require("tastypie");
var MongoseResource = tastypie.Resource.Mongoose;

// Default Query
var queryset = Test.find().lean().toConstructor()

// Define A Mongo Resource
var Mongo = MongoseResource.extend({
	options:{
		queryset: queryset
	}
	,fields:{
		firstName: {type:'CharField', attribute:'name.first'} // Remaps name.first to firstName
		,lastName: {type:'CharField', attribute:'name.last'} // Remaps name.last to lastName
	}
})
```

### Paging
You can use a number of special query string params to control how data is paged on the list endpoint. Namely -

* `limit` - Page size ( default 25 )
* `offset` - The starting point in the list

`limit=25&offset=50` would be the start of page 3

### Sorting
sorting is handled query param orderby where you can pass it the name of a field to sort on. Sorting is descending by default. Specifying a negetive field ( -<FOO> ) would flip the order

### Advanced Filtering
You might have noticed the filtering field on the schema. One of the things that makes an API "Good" is the ability to use query and filter the data to get very specific subsets of data. Tastypie exposes this through the query string as field and filter combinations. By default, the resource doesn't have anything enabled, you need to specify which filters are allowed on which fields, or specify 1 to allow everything

#### Filter Types

| Filter      | function                                  |
| ------------|------------------------------------------ |
| gt          | greater than                              |
| gte         | greater than or equal to                  |
| lt          | less than                                 |
| lte         | less than or equal to                     |
| in          | Value in set ( [ 1,2,3 ])                 |
| nin         | Value Not in set                          |
| size        | Size of set ( array length )              |
| startswith  | Case Sensitive string match               |
| istartswith | Case Insensitive string match             |
| endswith    | Case Sensitive string match               |
| iendswith   | Case Insensitive string match             |
| contains    | Case Sensitive global string match        |
| icontains   | Case Insensitive global string match      |
| exact ( = ) | Exact Case Sensitive string match         |
| iexact      | Exact Case Insensitive string match       |
| match       | Matches an item in an array ( elemMatch ) |
