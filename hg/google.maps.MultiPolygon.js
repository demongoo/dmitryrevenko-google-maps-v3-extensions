// version 0.9 google.maps.MultiPolygon object to maintain multipolygons as in OpenGIS MULTIPOLYGON spec.
if (typeof(google.maps.MultiPolygon) == 'undefined')
{
  // default options
  var MultiPolygonOptions = {
    clickable: true,
    fillColor: 'red',
    fillOpacity: 0.5,
    geodesic: false,
    map: null,
    strokeColor: 'black',
    strokeOpacity: 1.0,
    strokeWeight: 1,
    zIndex: null
  }
  
  // constructor - the options is the same as PoligonOptions except of paths transformed to polys (each contains an array of paths)
  google.maps.MultiPolygon = function(options)
  {
    var self = this;
    
    var options = typeof(options) !== 'undefined' ? options : {};
    
    var polys = new google.maps.MVCArray();
    
    // options merge
    var allOptions = {}
    for (var i in MultiPolygonOptions) allOptions[i] = MultiPolygonOptions[i];
    for (var i in options)
    {
      if (i == 'polys')
      {
        polys = new google.maps.MVCArray(options[i]);
      }
      else if (typeof(allOptions[i]) !== 'undefined')
        allOptions[i] = options[i];
    }
    google.maps.MVCObject.call(this, allOptions);
    for (var i in allOptions) this.set(i, allOptions[i]);
    
    // events
    this.events = ['click', 'dblclick', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'rightclick'];
    
    // polygon array
    var gpolys = new google.maps.MVCArray();
    // this will help to uniformly control props when adding or removing
    google.maps.event.addListener(gpolys, 'insert_at', function(idx)
    {
      self.bindPolygon(idx, this.getAt(idx));
    });
    google.maps.event.addListener(gpolys, 'set_at', function(idx, old)
    {
      self.unbindPolygon(idx, old);
      self.bindPolygon(idx, this.getAt(idx));
    });
    google.maps.event.addListener(gpolys, 'remove_at', function(idx, old)
    {
      self.unbindPolygon(idx, old);
    });
    
    // add polygons from config
    polys.forEach(function(value, number)
    {
      gpolys.push(self.__addPolygon(value));
    });
    
    // bind array to pass changes to child polygons
    for (var i in MultiPolygonOptions) { gpolys.set(i, this.get(i)); this.bindTo(i, gpolys); }
    gpolys.changed = function(prop)
    {
      this.forEach(function(poly)
      {
        poly.set(prop, self.get(prop));
      });
    }
    
    // set it as property
    this.set('polys', gpolys);
  }
  
  google.maps.MultiPolygon.prototype = new google.maps.MVCObject();
  
  // add new polygon to multipolygon
  google.maps.MultiPolygon.prototype.__addPolygon = function(value)
  {
    var poly;
    if (value instanceof google.maps.Polygon)
    {
      poly = value;
      var opts = {}
      for (var i in MultiPolygonOptions) opts[i] = this.get(i);
      poly.setOptions(opts);
    }
    else
    {
      var opts = {}
      for (var i in MultiPolygonOptions) opts[i] = this.get(i);
      opts.paths = value;
      poly = new google.maps.Polygon(opts);
    }
    
    return poly;
  }
  
  google.maps.MultiPolygon.prototype.setMap = function(map) { this.set('map', map) }
  google.maps.MultiPolygon.prototype.getMap = function() { this.get('map') }
  
  // bind new polygon into dependencies
  google.maps.MultiPolygon.prototype.bindPolygon = function(idx, polygon)
  {
    var self = this;
    
    // set props for sure
    for (var i in MultiPolygonOptions) polygon.set(i, this.get(i));
    
    // create event bubbling to parent
    for (var i = 0; i < this.events.length; i++)
    {
      this.__attachEventListener(polygon, this.events[i], idx);
    }
  }
  
  // unbind polygon from dependencies
  google.maps.MultiPolygon.prototype.unbindPolygon = function(idx, polygon)
  {
    google.maps.event.clearInstanceListeners(polygon);
  }
  
  // attach event listener to delegate to parent
  google.maps.MultiPolygon.prototype.__attachEventListener = function(polygon, evtName, idx)
  {
    var self = this;
    google.maps.event.addListener(polygon, evtName, function(evt)
    {
      google.maps.event.trigger(self, evtName, evt, idx);
    });
  }
  
  // set options
  google.maps.MultiPolygon.prototype.setOptions = function(options)
  {
    var opts = {};
    for (var i in options)
    {
      if (typeof(MultiPolygonOptions[i]) !== 'undefined')
      {
        opts[i] = options[i];
      }
    }
    
    this.setValues(opts);
  }
  
  // get polygon (first or at specified index)
  google.maps.MultiPolygon.prototype.getPolygon = function(idx)
  {
    var idx = typeof(idx) == 'number' ? idx : 0;
    return this.get('polys').getAt(idx);
  }
  
  // set Polygon
  google.maps.MultiPolygon.prototype.setPolygon = function(polygon, idx)
  {
    typeof(idx) == 'number' ? this.get('polys').setAt(idx, this.__addPolygon(polygon)) : this.addPolygon(polygon);
  }
  
  // add Polygon to multipolygon
  google.maps.MultiPolygon.prototype.addPolygon = function(polygon)
  {
    this.get('polys').push(this.__addPolygon(polygon));
  }
  
  // get polygons
  google.maps.MultiPolygon.prototype.getPolygons = function()
  {
    return this.get('polys');
  }
  
  // getBounds depends on Polygon realisation
  if (google.maps.Polygon.prototype.getBounds)
  {
    google.maps.MultiPolygon.prototype.getBounds = function()
    {
      var bounds = new google.maps.LatLngBounds();
      
      this.getPolygons().forEach(function(polygon)
      {
        bounds.union(polygon.getBounds());
      });
      
      return bounds;
    }
  }
  
  // contains also depends on Polygon realisation
  if (google.maps.Polygon.prototype.contains)
  {
    google.maps.MultiPolygon.prototype.contains = function(latLng)
    {
      // Outside the bounds means outside the polygon
      if (this.getBounds && !this.getBounds().contains(latLng))
      {
        return false;
      }
      
      for (var i = 0; i < this.getPolygons().getLength(); i++)
      {
        if (this.getPolygon(i).contains(latLng)) return true;
      }
      
      return false;
    }
  }
  
  // from Encoded is static factory method to create polygon from encoded string
  // using google polyline encoding algorithm + concatenation of paths with comma (,)
  // and concatenation of polys with semicolon (;)
  google.maps.MultiPolygon.fromEncoded = function(options)
  {
    if (typeof(options.polys) == 'undefined') throw Error('Please, use polys option to provide MultiPolygon data');
    
    var poptions = {};
    for (var i in MultiPolygonOptions) if (typeof(options[i]) != 'undefined') poptions[i] = options[i];
    
    poptions.polys = [];
    var epolys = options.polys.split(';');
    for (var i = 0; i < epolys.length; i++)
    {
      poptions.polys[i] = [];
      var paths = epolys[i].split(',');
      for (var j = 0; j < paths.length; j++)
      {
        poptions.polys[i].push(google.maps.geometry.encoding.decodePath(paths[j]));
      }
    }
    
    return new google.maps.MultiPolygon(poptions);
  }
}