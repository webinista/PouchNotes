var builddate, buildtime, buttonmenu, editbutton, 
delbutton, hashchanger, 
pn, PouchNotesObj, showview, svhandler, viewnotes, searchnotes;  

viewnotes   = document.querySelector('[data-show="#allnotes"]');
buttonmenu = document.getElementById('buttonwrapper');
editbutton = document.querySelector('button[type=button].edit');
delbutton  = document.querySelector('button[type=button].delete');

showview = document.querySelectorAll('button.clicktarget');

/*=============================
Utility functions
===============================*/

PouchNotesObj = function (databasename, remoteorigin) {
    'use strict';
    
    Object.defineProperty(this, 'pdb', {writable: true});
    Object.defineProperty(this, 'remote', {writable: true});
    Object.defineProperty(this, 'formobject', {writable: true});
    Object.defineProperty(this, 'notetable', {writable: true});
 	Object.defineProperty(this, 'searchformobject', {writable: true});
 	Object.defineProperty(this, 'errordialog', {writable: true});

    this.pdb = new PouchDB(databasename);
    this.remote = remoteorigin + '/'+databasename;

};


PouchNotesObj.prototype.buildtime = function(timestamp){
    var ts = new Date(+timestamp), time = [], pm, ampm;
    
    pm = (ts.getHours() > 12);
    
    time[0] = pm ? ts.getHours() - 12 : ts.getHours();
    time[1] = ('0'+ts.getMinutes()).substr(-2);
    
    if( time[0] == 12 ){
    	ampm = 'pm';
    } else {
    	ampm = pm ? 'pm' : 'am';
    }
    
    return ' @ '+time.join(':') + ampm ; 
}

PouchNotesObj.prototype.builddate = function (timestamp) {
    var d = [], date = new Date(timestamp);
   
    d[0] = date.getFullYear();
    d[1] = ('0'+(date.getMonth() + 1)).substr(-2);
    d[2] = ('0'+date.getDate()).substr(-2);
    return d.join('-');
} 

/* 
Create a function to log errors to the console for
development.
*/

PouchNotesObj.prototype.reporter = function (error, response) {
    'use strict';
    if (console !== undefined) {
        if (error) { console.log(error); }
        if (response) { console.log(response); }
    }
};

PouchNotesObj.prototype.showerror = function (error) {
    var o, txt, msg = this.errordialog.getElementsByClassName('msg')[0];
    for(o in error){
    	txt = document.createTextNode(error[o]);
    	msg.appendChild(txt);
    }
    this.errordialog.toggleClass('hide');
};

PouchNotesObj.prototype.show = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.remove('hide');
    });
};
PouchNotesObj.prototype.hide = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.add('hide');
    });
};
PouchNotesObj.prototype.resethash = function () {
    window.location.hash = '';   
}

PouchNotesObj.prototype.savenote = function () {
    'use strict';
    var o = {}, that = this;

    /* 
    If we have an _id, use it. Otherwise, create a timestamp
    for to use as an ID. IDs must be strings, so convert with `+ ''`
    */
    if (!this.formobject._id.value) {
        o._id = new Date().getTime() + ''; 
    } else {
        o._id = this.formobject._id.value;
    }
    
    if (this.formobject._rev.value) {
        o._rev = this.formobject._rev.value; 
    }
    
    /* 
    Build the object based on whether the field has a value.
    This is a benefit of a schema-free object store type of 
    database. We don't need to include values for every property.
    */
    
    o.notetitle = (this.formobject.notetitle.value == '') ? 'Untitled Note' : this.formobject.notetitle.value;
    o.note      = (this.formobject.note.value == '') ? '' : this.formobject.note.value;
    o.tags      = (this.formobject.tags.value == '') ? '' : this.formobject.tags.value;
    o.modified  = new Date().getTime();
    
    this.pdb.put(o, function (error, response) {
        if(error){
            that.showerror(error);
        }
        
        if(response && response.ok){     	    	
     		if(that.formobject.attachment.files.length){
				var reader = new FileReader();
				
				/* 
				Using a closure so that we can extract the 
				File's data in the function.
				*/
				reader.onload = (function(file){
					return function(e) {
						that.pdb.putAttachment(response.id, file.name, response.rev, e.target.result, file.type);
					}
				})(that.formobject.attachment.files.item(0));
				
				reader.readAsDataURL(that.formobject.attachment.files.item(0));
			}
			    	   			
           	that.viewnoteset();
        	that.formobject.reset();
        	
        	that.show(that.formobject.dataset.show);
           	that.hide(that.formobject.dataset.hide);
        	
           	viewnotes.dispatchEvent(new MouseEvent('click')); 
		}
    });
 	
 	this.resethash();
};

PouchNotesObj.prototype.viewnote = function (noteid) {
    'use strict';
    
    var that = this, noteform = this.formobject;
    
    this.pdb.get(noteid, {attachments:true}, function (error, response) {
        var fields = Object.keys(response), o, link, attachments, li;
    
    	if (error) {
           	this.showerror();
            return;
        } else {
        	
        	fields.map( function (f) {
				if (noteform[f] !== undefined && noteform[f].type != 'file') {
					noteform[f].value = response[f];
				}
				if (f == '_attachments') {
					attachments = response[f];
					for (o in attachments) {
						li = document.createElement('li');
						link = document.createElement('a');
						link.href = 'data:' + attachments[o].content_type + ';base64,' + attachments[o].data;
						link.target = "_blank";
						link.appendChild(document.createTextNode(o));
						li.appendChild(link);
					}
					document.getElementById('attachmentlist').appendChild(li);
								
				}	
			})
                
            // fill in form fields with response data.     
            that.show('#addnote');
            that.hide('section:not(#addnote)');
            that.show('#attachments');	
        } 
    }); 
    
 	if (window.location.hash.indexOf(/view/) > -1 ) {
        // disable form fields
        noteform.classList.add('disabled');
        
        Array.prototype.map.call( noteform.querySelectorAll('input, textarea'), function(i){
        	if (i.type !== 'hidden') {
        		i.disabled = 'disabled';
        	}
        });
        
        buttonmenu.classList.remove('hide');
    }
}

PouchNotesObj.prototype.deletenote = function (noteid) {
	var that = this;
	/* IDs must be a string */
    
 	this.pdb.get(noteid+'', function (error, doc) {
		that.pdb.remove(doc, function (e, r) {	
        	if(e){
        		that.showerror();
        	} else {
        		viewnotes.dispatchEvent(new MouseEvent('click'));
        	}            
    	});
    });
}

/* 
TO DO: refactor so we can reuse this function.
*/
PouchNotesObj.prototype.viewnoteset = function (start, end) {
    var i, 
    that = this, 
    df = document.createDocumentFragment(), 
    options = {}, 
    row,   
    nl = this.notetable.querySelector('tbody');    
		
    options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }
    
    this.pdb.allDocs(options, function (error, response) {
    	/* 
    	What's `this` changes when a function is called
    	with map. That's why we're passing `that`.
    	*/    	
        row = response.rows.map(that.addrow, that);
        row.map(function(f){
        	if (f) {
            	df.appendChild(f); 
            } 
        });
        
        i = nl.childNodes.length;    
		while(i--){
			nl.removeChild(nl.childNodes.item(i));   
		}
	
        nl.appendChild(df);
    });
    
    this.resethash();
}

PouchNotesObj.prototype.addrow = function (obj) {
    var tr, td, a, o, created;
 	
    a  = document.createElement('a');
    tr = document.createElement('tr');
    td = document.createElement('td'); 
    
    a.href = '#/view/'+obj.id;
    a.innerHTML = obj.doc.notetitle === undefined ? 'Untitled Note' : obj.doc.notetitle;
    td.appendChild(a);
    tr.appendChild(td);

    created = td.cloneNode(false);
    created.innerHTML = this.builddate(+obj.id) + this.buildtime(+obj.id);
      
    updated = created.cloneNode();
    updated.innerHTML = obj.doc.modified ? this.builddate(+obj.doc.modified) + this.buildtime(+obj.doc.modified) : this.builddate(+obj.id) + this.buildtime(+obj.id);
    
    tr.appendChild(created);
    tr.appendChild(updated);
  
    return tr;    
}


PouchNotesObj.prototype.search = function(searchkey) {
	var that = this;

	var map = function(doc) {
		/* 
		Need to do grab the value directly because 
		there isn't a way to pass it any other way.
		*/
		
		var searchkey,regex;
		searchkey = document.getElementById('q').value.replace(/[$-\/?[-^{|}]/g, '\\$&');
		regex = new RegExp(searchkey,'i');
		
		if( regex.test(doc.notetitle) || regex.test(doc.note) || regex.test(doc.tags) ){		
			emit(doc._id, {notetitle: doc.notetitle, id: doc._id, modified: doc.modified});
		}
	}
	
  	this.pdb.query(map, function(err, response) { 
  		if(err){ console.log(err); }
  		if(response){
	 		var df, rows, nl, results;
	 		
	 		results = response.rows.map(function(r){
  				r.doc = r.value;
  				delete r.value;
  				return r;
  			});
  			nl = that.notetable.getElementsByTagName('tbody')[0];
  			df = document.createDocumentFragment(), 
  			rows = results.map(that.addrow, that);
  			rows.map(function(f){
        		if (f) {
            		df.appendChild(f); 
            	} 
        	});
        	nl.innerHTML = '';
        	nl.appendChild(df);
  		}
  	});
}


/*------ Maybe do in a try-catch ? ------*/
pn = new PouchNotesObj('pouchnotes');

pn.formobject = document.getElementById('noteform');
pn.notetable  = document.getElementById('notelist');
pn.searchformobject  = document.getElementById('searchnotes');
pn.errordialog  = document.getElementById('errordialog');

pn.searchformobject.addEventListener('submit', function (e) {
   'use strict';
    e.preventDefault();
    pn.search(); 
});

pn.formobject.addEventListener('submit', function (e) {
    e.preventDefault();
    pn.savenote()
});

pn.formobject.addEventListener('reset', function (e) {
    var disableds = document.querySelectorAll('#noteform [disabled]');
    e.target.classList.remove('disabled');
    Array.prototype.map.call(disableds, function(o){
        o.removeAttribute('disabled'); 
    });
    pn.hide('#attachments');
    document.getElementById('attachmentlist').innerHTML = '';
});

window.addEventListener('hashchange', function (e) {
    var noteid;
    if(window.location.hash.replace(/#/,'') ){
        noteid = window.location.hash.match(/\d/g).join('');
        pn.viewnote(noteid);
    }
});

svhandler = function (evt) {
	var attchlist = document.getElementById('attachmentlist');
	
    if (evt.target.dataset.show) {
        pn.show(evt.target.dataset.show);
    }
    if (evt.target.dataset.hide) {
        pn.hide(evt.target.dataset.hide);
    }
    
    if (evt.target.dataset.action) {
        pn[evt.target.dataset.action]();
    }
    
    if (evt.target.dataset.show === '#addnote') {
        pn.formobject.reset();
        
        /* Force reset on hidden fields. */
        pn.formobject._id.value = ''; 
        pn.formobject._rev.value = ''; 
    }
    pn.hide('#attachments');
    attchlist.innerHTML = '';
    pn.searchformobject.reset();
    pn.resethash();
};

/* TO DO: Refactor these click actions to make the functions reusable */

editbutton.addEventListener('click', function (e) {
    pn.formobject.classList.remove('disabled'); 
    
     Array.prototype.map.call( pn.formobject.querySelectorAll('input, textarea'), function(i){
		if (i.type !== 'hidden') {
			i.removeAttribute('disabled');
		}
	});
});

delbutton.addEventListener('click', function (e) {
    pn.deletenote(+e.target.form._id.value);
});

Array.prototype.map.call(showview, function (ct) {
    ct.addEventListener('click', svhandler);
});
   
Array.prototype.map.call(document.getElementsByClassName('dialog'), function (d) {
    d.addEventListener('click', function(evt){
        if(evt.target.dataset.action === 'close'){
            d.classList.add('hide');
        };
    });
});

window.addEventListener('DOMContentLoaded', function(event){
    viewnotes.dispatchEvent(new MouseEvent('click'));
});

pn.formobject.addEventListener('change', function(event){
	if(event.target.type === 'file'){
		var fn = event.target.value.split('\\');
		document.querySelector('.filelist').innerHTML = fn.pop();
	}
});
