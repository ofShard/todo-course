$(document).ready(function() {
    var socket = io.connect('/').of('calendar'),
        access = false,
        calendar = $('#calendar'),
        edit = $('#event-edit'),
        count=0,
        editData,
        updating = {},
        createButton, titleField, updateButton, editForm, deleteButton;
    
    createButton = $('#event-create').button({icons:{secondary:'ui-icon-plusthick'}})
    .click(function(ev) {
        ev.stopPropagation();
        
        var event = {title:'My Event '+(++count)},
            element = createDraggableEvent(event);
        
        startEditing(element, event, true);
        
        return false;
    });
    
    titleField = $('#event-title');
    
    function hideClickHandler(ev){
        console.log('hideClick');
        // if the target is a descendent of container do nothing
        if($(ev.target).is("#event-edit, #event-edit *")) return;
        
        // remove event handler from document
        $(document).off("click", hideClickHandler);
        
        stopEditing();
        edit.hide();
    }
    
    editForm = $('#event-edit-form').submit(function(ev) {
        ev.stopPropagation();
        
        if( editData && !editData.event._nonce ) updateButton.click();
        
        return false;
    });
    
    updateButton = $('#event-update').button({icons:{secondary:'ui-icon-transferthick-e-w'}})
    .click(function(ev) {
        ev.stopPropagation();
        
        if( !editData ) return;
        
        if( editData.external ) {
            editData.event.title = titleField.val();
            editData.element.text(titleField.val()).data('eventObject', editData.event);
        }
        else {
            editData.event.title = titleField.val();
            calendar.fullCalendar('updateEvent', editData.event);
            
            var data = editData.event,
                event = {_id:data._id, title:data.title, start:data.start, end:data.end};
            
            console.log('updating event', event);
            socket.emit('event changed', event);
        }
        
        return false;
    });
    
    deleteButton = $('#event-delete').button({icons:{secondary:'ui-icon-closethick'}})
    .click(function(ev) {
        ev.stopPropagation();
        
        if( !editData ) return;
        
        if( editData.external ) editData.element.remove();
        else {
            calendar.fullCalendar('removeEvents', editData.event._id);
            
            console.log('removing event', editData.event._id);
            socket.emit('event removed', editData.event._id);
        }
        
        edit.hide();
        
        return false;
    });
    
    function startEditing(element, data, external) {
        stopEditing();
        
        titleField.val(data.title||'');
        editData = {element:element, event:data, external:external};
        
        $(element).addClass('ui-state-active');
        
        if( data.nonce ) {
            updateButton.attr('disabled', 'disabled');
            deleteButton.attr('disabled', 'disabled');
        }
        else {
            updateButton.removeAttr('disabled');
            deleteButton.removeAttr('disabled');
        }
        
        edit.show();
        $(document).on('click.todo', hideClickHandler);
    }
    
    function stopEditing() {
        $(document).off('click.todo');
        
        if( editData ) $(editData.element).removeClass('ui-state-active');
    }
    
    function createDraggableEvent(data) {
        var element = $('<div class="external-event">'+data.title+'</div>').appendTo('#external-events');
        
        element.data('eventObject', data)
        .draggable({
        	zIndex: 999,
			revert: true,      // will cause the event to go back to its
			revertDuration: 0  //  original position after the drag
		})
        .click(function(ev) {
            startEditing(element, element.data('eventObject'), true);
            
            ev.stopPropagation();
            return false;
        });
        
        return element;
    }
    
    var dragData;
    
    var externalEvents = $('#external-events-container').droppable({
        accept:'.fc-event-draggable',
        hoverClass:'ui-state-active'
    })
    .bind('dropover', function(event, ui) {
        if( !dragData ) return;
        
        console.log('dropover');
        
        $(dragData.element).draggable('option', 'revert', false);
    })
    .bind('dropout', function(event, ui) {
        if( !dragData ) return;
        
        console.log('dropout');
        
        $(dragData.element).draggable('option', 'revert', true);
    })
    .bind('drop', function(event, ui) {
        if( !dragData ) return;
        
        $(dragData.element).hide();
        createDraggableEvent(dragData.event);
        calendar.fullCalendar('removeEvents', dragData.event._id);
        
        console.log('removing event', dragData.event._id);
        socket.emit('event removed', dragData.event._id);
    });
    
    function requestAccess() {
        access = false;
        console.log('request access', calendarID, requestWrite);
        socket.emit('calendar', calendarID, requestWrite);
    }
    
    socket.on('connect', requestAccess);
    
    socket.on('reconnect', requestAccess);
    
    socket.on('error', function(err) {
        console.log('error', err);
    });
    
    socket.on('success', function() {
        console.log((requestWrite?'write':'read')+' access granted');
        access = true;
    });
    
    socket.on('event created', function(event) {
        console.log('event created', event);
        calendar.fullCalendar('renderEvent', event, true);
    });
    
    socket.on('event id', function(eventID, nonce) {
        console.log('event id', eventID, nonce);
        
        if( !updating[nonce] ) return;
        
        var event = updating[nonce];
        
        calendar.fullCalendar('removeEvents', function(data) {
            if( data.nonce === nonce ) console.log('replacing nonce event', data.title);
            return data.nonce === nonce;
        });
        
        if( editData && editData.event.nonce === nonce ) stopEditing();
        
        event._id = eventID;
        delete event.nonce;
        delete updating[nonce];
        
        calendar.fullCalendar('renderEvent', event, true);
        //calendar.fullCalendar('updateEvent', event);
    });
    
    socket.on('event changed', function(event) {
        console.log('event changed', event);
        
        if( event.start && !(event.start instanceof Date) ) event.start = new Date(event.start);
        if( event.end && !(event.end instanceof Date) ) event.end = new Date(event.end);
        
        console.log('event changed', event);
        
        if( editData && editData.event && editData.event._id === event._id ) {
            editData.event.title = event.title;
            titleField.val(event.title);
            
            if( editData.external ) editData.element.text(event.title);
        }
        
        //var events = calendar.fullCalendar('clientEvents', event._id);
        //calendar.fullCalendar('updateEvent', events[0]);
        calendar.fullCalendar('removeEvents', event._id);
        calendar.fullCalendar('renderEvent', event, true);
    });
    
    socket.on('event removed', function(eventID) {
        console.log('event removed', eventID);
        
        calendar.fullCalendar('removeEvents', eventID);
    });

	/* initialize the external events
	-----------------------------------------------------------------*/

	$('#external-events div.external-event').each(function() {
	
		// create an Event Object (http://arshaw.com/fullcalendar/docs/event_data/Event_Object/)
		// it doesn't need to have a start or end
		var eventObject = {
			title: $.trim($(this).text()) // use the element's text as the event title
		};
		
		// store the Event Object in the DOM element so we can get to it later
		$(this).data('eventObject', eventObject);
		
		// make the event draggable using jQuery UI
		$(this).draggable({
			zIndex: 999,
			revert: true,      // will cause the event to go back to its
			revertDuration: 0  //  original position after the drag
		});
		
	});


	/* initialize the calendar
	-----------------------------------------------------------------*/
	
	calendar.fullCalendar({
        events:'/calendar/'+calendarID+'/events',
        theme:true,
		header: {
			left: 'prev,next today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		},
        selectable:true,
		editable: true,
		droppable: true, // this allows things to be dropped onto the calendar !!!
        eventClick: function(event, jsEvent, view) {
            startEditing(this, event);
            jsEvent.stopPropagation();
            return false;
        },
        dayClick: function(event, allDay, jsEvent, view) {
            edit.hide();
        },
		drop: function(date, allDay) { // this function is called when something is dropped
            var element = $(this);
			// retrieve the dropped element's stored Event Object
			var orig = element.data('eventObject');
			
			// we need to copy it, so that multiple events don't have a reference to the same object
			var copiedEventObject = $.extend({}, orig);
			
            var nonce = uid(10),
                newEvent = {title:orig.title, start:date, allDay:allDay};
            
            console.log('newEvent', newEvent);
            
			// remove the element from the "Draggable Events" list
			element.remove();
            
            socket.emit('event created', newEvent, nonce);
            
            console.log('nonce', nonce);
            
            newEvent.nonce = nonce;
            
            stopEditing();
            
            calendar.fullCalendar('renderEvent', newEvent);
		},
        eventAfterRender: function(event, element, view) {
            if( event.nonce ) {
                updating[event.nonce] = event;
            }
        },
        eventDrop: function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
            var movedEvent = {title:event.title, _id:event._id, start:event.start, end:event.end, allDay:event.allDay};
            
            console.log('event dropped', event);
            
            socket.emit('event changed', movedEvent, dayDelta, minuteDelta);
        },
        eventResize: function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {
            var movedEvent = {title:event.title, _id:event._id, start:event.start, end:event.end, allDay:event.allDay};
            
            console.log('event resized', event);
            
            socket.emit('event changed', movedEvent, dayDelta, minuteDelta);
        },
        eventDragStart:function(event, ev, ui) {
            console.log('eventDragStart', event);
            dragData = {element:this, event:event};
        },
        eventDropStop:function(event, ev, ui) {
            console.log('eventDragStop', event);
            dragData = false;
        }
	});
});

function uid(len, pool) {
    pool = pool || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    var str = '';
    
	for( var i=0; i<len; i++ ) {
		str += pool[randInt(0, pool.length-1)];
	}
	
	return str;
}

function randInt(min, max) {
    var range = max-min+1;

	return Math.floor(min + (Math.random()*range));
}