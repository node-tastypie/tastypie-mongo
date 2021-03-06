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
  name: {
    first: {type:String}
  , last: {type:String}
  }
, index: {type:Number, required:false}
, guid: {type:String, requierd:false}
, tags: [{type:String}]
}, {collection:'tastypie'})

var Test = connection.model('Test', Schema)
```

##### Define A Resource
```js
var tastypie = require("tastypie");
var MongoseResource = require('tastypie-mongoose');

// Default Query
var queryset = Test.find().lean().toConstructor()

// Define A Mongo Resource
var Mongo = MongoseResource.extend({
  options: {
    queryset: queryset
  }
, fields: {
    firstName: {type:'CharField', attribute:'name.first'} // Remaps name.first to firstName
  , lastName: {type:'CharField', attribute:'name.last'} // Remaps name.last to lastName
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


Filters are added by appending a double underscore ``__`` and the filter type to the end of a field name. Given our example, if we wanted to find people who were older than 25, we would use the following URI syntax

```bash
http://localhost:3000/api/v1/user?age__gt=25
```
Filters are additive for a given field. For example, if we we only wanted people where we between 25 and 45, we would just add another filter

```bash
http://localhost:3000/api/v1/user?age__gt=25&age__lt=45
```

The same double underscore `__` syntax is used to access nested fields where the filter is always the last parameter. So we could find people whos age was  **greater than** 25, **less than** 45 and whose Company Name **starts with** `W`

```bash
http://localhost:3000/api/v1/user?age__gt=25&age__lt=45&company__name__istartswith=w
```

Remember, remapped fields still work for filtering, so the same would also be true for `companyName`

```bash
http://localhost:3000/api/v1/user?age__gt=25&age__lt=45&companyName__istartswith=w
```

Resources provide a simple and expressive syntax to query for very specific subsets of data without any of the boilerplate work to set it up. And as you would expect, regular params will map back to `exact` where applicable

```bash
http://localhost:3000/api/v1/user?age=44
```


#### Serialization

Tastypie supports multiple serialization formats out of the box as well as a way to define your own custom formats. The base `serializer` class supports `xml`, `json` & `jsonp` by default. You add formats or create your own serialization formats by subclassing the `Serializer` class and defining the approriate methods. Each format must define a `to_<FORMAT>` and a `from_<FORMAT>`. For example, tastypie defines the `to_xml` and `from_xml` methods. JSON is defined by `to_json`, `from_json`

To get back xml just change the `Accept` header
**NOTE:** *Hapi deals with most `application/foo` formats, but is blind to `text/foo`. So the safe bet here is to use `text/xml`*

```xml
// curl -H "Accept: text/xml" http://localhost:3000/api/v1/user

<?xml version="1.0" encoding="UTF-8"?>
<response>
 <meta type="object">
  <count type="number">100</count>
  <limit type="number">1</limit>
  <offset type="number">0</offset>
  <previous type="null">null</previous>
  <next type="string">/api/v1/meth?limit=25&offset=25</next>
 </meta>
 <data type="array">
  <object type="object">
   <name type="string">Dejesus Zimmerman</name>
   <age type="number">31</age>
   <companyName type="string">AVENETRO</companyName>
   <id type="string">557af820f3c3008b415de02c</id>
   <uri type="string">/api/v1/meth/557af820f3c3008b415de02c</uri>
  </object>
 </data>
</response>
```
