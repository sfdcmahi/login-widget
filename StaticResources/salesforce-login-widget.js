/*
	Salesforce.com 2015 Meebo Inc.
	Copyright 2010 Meebo Inc.

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	    http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

var SFIDWidget_loginHandler;
var SFIDWidget_logoutHandler;

var SFIDWidget = function() {
	
	this.config = null;
	this.access_token = null;
	this.openid = null;
	this.openid_response = null;
	
	// Reference shortcut so minifier can save on characters
	this.win = window;

	// Check for browser capabilities
	this.unsupported = !(win.postMessage && win.localStorage && win.JSON);
	
	this.XAuthServerUrl = null;
	this.iframe = null;
	this.postWindow = null;

	// Requests are done asynchronously so we add numeric ids to each
	// postMessage request object. References to the request objects
	// are stored in the openRequests object keyed by the request id.
	this.openRequests = {};
	this.requestId = 0;

	// All requests made before the iframe is ready are queued (referenced by
	// request id) in the requestQueue array and then called in order after
	// the iframe has messaged to us that it's ready for communication
	this.requestQueue = [];
	

	
	function addButton(targetDiv) {
		targetDiv.innerHTML = '';
		var button = document.createElement("button"); 
	 	button.className = "sfid-button";
		button.innerHTML = "Log in";
		button.setAttribute("onClick", "SFIDWidget.login()");
		targetDiv.appendChild(button);		
	}
	
	
	
	function addLogin(targetDiv) {

		if (targetDiv != null) targetDiv.innerHTML = '';

		var content = document.createElement('div'); 
		if (SFIDWidget.config.mode == 'modal') content.id = "sfid-content";
		else if (SFIDWidget.config.mode == 'inline') content.id = "sfid-inline-content";
		
		if (SFIDWidget.config.mode == 'modal')  {
			if (SFIDWidget.authconfig.LoginPage.LogoUrl != null ) {
				var logowrapper = document.createElement('div'); 
			 	logowrapper.id = "sfid-logo_wrapper";
			 	logowrapper.className = "sfid-standard_logo_wrapper sfid-mt12";
			
				var img = document.createElement('img'); 
			 	img.src = SFIDWidget.authconfig.LoginPage.LogoUrl; 
				img.className = "sfid-standard_logo";
			
				logowrapper.appendChild(img);
				content.appendChild(logowrapper);
			}
		}
		
		if (SFIDWidget.authconfig.LoginPage.UsernamePasswordEnabled) {
			var form = document.createElement('form'); 
			form.setAttribute("action", SFIDWidget.config.communityURL + "/loginpage");
			form.setAttribute("method", "POST");
			
			var un = document.createElement('input'); 
			un.className = "sfid-wide sfid-mb12";
			un.type = "text";
			un.name = "username";
			un.id = "sfid-username";
			un.setAttribute("placeholder", "Username");
			//un.setAttribute("autofocus", "true");
			
			var pw = document.createElement('input'); 
			pw.className = "sfid-wide sfid-mb12";
			pw.type = "password";
			pw.name = "password";
			pw.id = "sfid-password";
			pw.setAttribute("placeholder", "Password");
			
			
			var su = document.createElement('input'); 
			su.type = "hidden";
			su.name = "startURL";
			su.value = SFIDWidget.config.authorizeURL;
			su.id = "sfid-starturl";

			var button = document.createElement("input"); 
		 	button.className = "sfid-button sfid-primary sfid-wide sfid-mb16";
			button.type = "submit";
			button.value = "Log in";
			
			form.appendChild(un);
			form.appendChild(pw);
			form.appendChild(su);
			form.appendChild(button);
			
			content.appendChild(form);
			
		}
		
		if ((SFIDWidget.authconfig.LoginPage.UsernamePasswordEnabled) && (SFIDWidget.authconfig.AuthProviders.length > 0)) {
			
			var orloginwith = document.createElement("p"); 
			orloginwith.className = "sfid-small sfid-mb16";
			orloginwith.innerHTML = "or log in with";
			content.appendChild(orloginwith);
			
			
		} else if ((!SFIDWidget.authconfig.LoginPage.UsernamePasswordEnabled) && (SFIDWidget.authconfig.AuthProviders.length > 0)) {
			
			var orloginwith = document.createElement("p"); 
			orloginwith.className = "sfid-small sfid-mb16";
			orloginwith.innerHTML = "Choose a Provider";
			content.appendChild(orloginwith);
			
		}
		
		
		
		
		if (SFIDWidget.authconfig.AuthProviders.length > 0) {
		
			var social = document.createElement('div'); 
		 	social.id = "sfid-social";
		
			var socialul = document.createElement('ul'); 
		
			for (var i in SFIDWidget.authconfig.AuthProviders) {
		
				var socialli = document.createElement('li'); 
				
				var icon = document.createElement('img'); 
			 	icon.src = SFIDWidget.authconfig.AuthProviders[i].IconUrl; 
		
				var a = document.createElement('a');
				a.href = SFIDWidget.authconfig.AuthProviders[i].SsoUrl + '&startURL=' + encodeURIComponent(SFIDWidget.config.authorizeURL);
				a.appendChild(icon);
				a.title = SFIDWidget.authconfig.AuthProviders[i].Name;
				socialli.appendChild(a);		
				
				socialul.appendChild(socialli);
		
			}
			social.appendChild(socialul);
			content.appendChild(social);
		
		}
		
		if (SFIDWidget.config.mode == 'modal') {
		
			var lightbox = document.createElement('div'); 
		 	lightbox.className = "sfid-lightbox";
		 	lightbox.id = "sfid-login-overlay";
			lightbox.setAttribute("onClick", "SFIDWidget.cancel()");
		
			var wrapper = document.createElement('div'); 
		 	wrapper.id = "sfid-wrapper";
			wrapper.onclick = function(event) {
			    event = event || window.event // cross-browser event
    
			    if (event.stopPropagation) {
			        // W3C standard variant
			        event.stopPropagation()
			    } else {
			        // IE variant
			        event.cancelBubble = true
			    }
			}
		
			wrapper.appendChild(content);
			lightbox.appendChild(wrapper);
		
			document.body.appendChild(lightbox);	
		} else {
			targetDiv.appendChild(content);			
		}
	}
	

	function closeLogin() {
		var lightbox = document.getElementById("sfid-login-overlay");
		lightbox.style.display = "none";
		if (lightbox.parentNode) {
		  lightbox.parentNode.removeChild(lightbox);
		}
		
	}
	
	

	// Listener for window message events, receives messages from only
	// the xauth domain that we set up in the iframe
	function onMessage(event) {
		// event.origin will always be of the format scheme://hostname:port
		// http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#dom-messageevent-origin
		var originHostname = event.origin.split('://')[1].split(':')[0];
		if(originHostname != SFIDWidget.config.domain ) {
			// Doesn't match xauth.org, reject
			console.log('doesnt match domain: ' + originHostname + ";" + SFIDWidget.config.domain);
			return;
		}
		
		// unfreeze request message into object
		var msg = JSON.parse(event.data);
		if(!msg) {
			return;
		}

		// Check for special iframe ready message and call any pending
		// requests in our queue made before the iframe was created.
		if(msg.cmd == 'xauth::ready') {
			// Cache the reference to the iframe window object
			postWindow = iframe.contentWindow;
			setTimeout(makePendingRequests, 0);
			return;
		}

		// Look up saved request object and send response message to callback
		var request = openRequests[msg.id];
		if(request) {
			if(request.callback) {
				request.callback(msg);
			}
			delete openRequests[msg.id];
		}
	}

	// Called once on first command to create the iframe to xauth.org
	function setupWindow() {
		if(iframe || postWindow) { return; }
		
		// Create hidden iframe dom element
		var doc = win.document;
		iframe = doc.createElement('iframe');
		var iframeStyle = iframe.style;
		iframeStyle.position = 'absolute';
		iframeStyle.left = iframeStyle.top = '-999px';

		// Setup postMessage event listeners
		if (win.addEventListener) {
			win.addEventListener('message', onMessage, false);
		} else if(win.attachEvent) {
			win.attachEvent('onmessage', onMessage);
		}

		// Append iframe to the dom and load up xauth.org inside
		doc.body.appendChild(iframe);
		iframe.src = SFIDWidget.XAuthServerUrl;
	}
	
	// Called immediately after iframe has told us it's ready for communication
	function makePendingRequests() {
		for(var i=0; i<requestQueue.length; i++) {
			makeRequest(openRequests[requestQueue.shift()]);
		}
	}

	// Simple wrapper for the postMessage command that sends serialized requests
	// to the xauth.org iframe window
	function makeRequest(requestObj) {
		postWindow.postMessage(JSON.stringify(requestObj), SFIDWidget.XAuthServerUrl);
	}

	// All requests funnel thru queueRequest which assigns it a unique
	// request Id and either queues up the request before the iframe
	// is created or makes the actual request
	function queueRequest(requestObj) {
		if(unsupported) { return; }
		requestObj.id = requestId;
		openRequests[requestId++] = requestObj;
		// If window isn't ready, add it to a queue
		if(!iframe || !postWindow) {
			requestQueue.push(requestObj.id);
			setupWindow(); // must happen after we've added to the queue
			
		} else {
			makeRequest(requestObj);
		}
	}
	
	// Following three functions are just API wrappers that clean up the
	// the arguments passed in before they're sent and attach the
	// appropriate command strings to the request objects

	function callRetrieve(args) {
		if(!args) { args = {}; }
		var requestObj = {
			cmd: 'xauth::retrieve',
			retrieve: args.retrieve || [],
			callback: args.callback || null
		}
		queueRequest(requestObj);
	}
	
	function callExtend(args) {
		if(!args) { args = {}; }
		var requestObj = {
			cmd: 'xauth::extend',
			token: args.token || '',
			expire: args.expire || 0,
			extend: args.extend || [],
			session: args.session || false,
			callback: args.callback || null
		}
		queueRequest(requestObj);
	}
	
	function callExpire(args) {
		if(!args) { args = {}; }
		var requestObj = {
			cmd: 'xauth::expire',
			callback: args.callback || null
		}
		queueRequest(requestObj);
	}
	
	function setup(response) {
        var tokens = response.tokens;
        for(var domain in tokens) {
            var encodedToken = tokens[domain]['token'];
			var decodedToken = atob(encodedToken);
			SFIDWidget.openid_response = JSON.parse(decodedToken);
        }
		if (SFIDWidget.openid_response) {
			window[SFIDWidget_loginHandler](SFIDWidget.openid_response);
		} else {

			if (SFIDWidget.config.mode == 'popup') {

				var targetDiv = document.querySelector(SFIDWidget.config.target );
				addButton(targetDiv);
	
			} else if ((SFIDWidget.config.mode == 'modal') || (SFIDWidget.config.mode == 'inline')) {
	
				var request = new XMLHttpRequest();
				request.onreadystatechange = function () {
				    var DONE = this.DONE || 4;
				    if (this.readyState === DONE){
						SFIDWidget.authconfig = JSON.parse(this.responseText);
						
						var state = '';
						if (SFIDWidget.config.mode == 'popup') {
							state = encodeURIComponent(SFIDWidget_loginHandler); 
						} else {
							state = (SFIDWidget.config.startURL ? encodeURIComponent(SFIDWidget.config.startURL) : '');
						}
				
						SFIDWidget.config.authorizeURL = '/services/oauth2/authorize?response_type=token&client_id=' + SFIDWidget.config.client_id + '&redirect_uri=' + encodeURIComponent(SFIDWidget.config.redirect_uri) + '&state=' + state; 
				
						if (SFIDWidget.config.mode == 'modal') {
							var targetDiv = document.querySelector(SFIDWidget.config.target );
							addButton(targetDiv);
						} else {
							var targetDiv = document.querySelector(SFIDWidget.config.target );
							addLogin(targetDiv);
						}
				    }
				};
				request.open('GET', SFIDWidget.config.communityURL + '/.well-known/auth-configuration', true);
				request.send(null);
	
			}	

		}

	}
	

	return {
		init: function() {
			
			SFIDWidget.config = {};
			
			SFIDWidget.config.startURL = location.pathname+location.search;
			
			var communityURLTag = document.querySelector('meta[name="salesforce-community"]');
			if (communityURLTag == null) {
				alert('Specify a meta-tag for salesforce-community');
				return;
			} else {
				SFIDWidget.config.communityURL = communityURLTag.content;
				var rawDomain = SFIDWidget.config.communityURL.substring(8,SFIDWidget.config.communityURL.length);
				if (rawDomain.indexOf("/") > 0) rawDomain = rawDomain.substring(0,rawDomain.indexOf('/'));
				SFIDWidget.config.domain = rawDomain;
				SFIDWidget.XAuthServerUrl = SFIDWidget.config.communityURL + "/services/apexrest/xauth";
				
			}
			
			var modeTag = document.querySelector('meta[name="salesforce-mode"]');
			if (modeTag == null) {
				alert('Specify a meta-tag for salesforce-mode');
				return;
			} else {
				SFIDWidget.config.mode = modeTag.content;
				if ((SFIDWidget.config.mode == 'popup-callback') || (SFIDWidget.config.mode == 'modal-callback') || (SFIDWidget.config.mode == 'inline-callback')) {
					SFIDWidget.handleLoginCallback();
					return;
				}
			}
		
			var client_idTag = document.querySelector('meta[name="salesforce-client-id"]');
			if (client_idTag == null) {
				alert('Specify a meta-tag for salesforce-client-id');
				return;
			} else {
				SFIDWidget.config.client_id = client_idTag.content;
			}
			
			var redirect_uriTag = document.querySelector('meta[name="salesforce-redirect-uri"]');
			if (redirect_uriTag == null) {
				alert('Specify a meta-tag for salesforce-redirect-uri');
				return;
			} else {
				SFIDWidget.config.redirect_uri = redirect_uriTag.content;
			}
	
			
			var targetTag = document.querySelector('meta[name="salesforce-target"]');
			if (targetTag == null) {
				alert('Specify a meta-tag for salesforce-target');
				return;
			} else {
				SFIDWidget.config.target = targetTag.content;
			}
	
			
			var loginHandlerTag = document.querySelector('meta[name="salesforce-login-handler"]');
			if (loginHandlerTag == null) {
				alert('Specify a meta-tag for salesforce-login-handler');
				return;
			} else {
				SFIDWidget_loginHandler = loginHandlerTag.content;
			}
			
			var logoutHandlerTag = document.querySelector('meta[name="salesforce-logout-handler"]');
			if (logoutHandlerTag != null) {
				SFIDWidget_logoutHandler = logoutHandlerTag.content;
			}
			
			
			if ((SFIDWidget.config.mode == 'popup') || (SFIDWidget.config.mode == 'modal') || (SFIDWidget.config.mode == 'inline')) {
			    SFIDWidget.getToken({
			      retrieve: [location.host],
			      callback: setup
			    });
				
			}
	
			
		}, login: function() {
			
			if (SFIDWidget.config != null) {
				
				if (SFIDWidget.config.mode == 'popup') {
					
					//window.location = startURL;
					var loginWindow = window.open(SFIDWidget.config.communityURL + SFIDWidget.config.authorizeURL,'Login Window','height=580,width=450');
					if (window.focus) {loginWindow.focus()}
					return false;
				
				} else if (SFIDWidget.config.mode == 'modal') {
				
					addLogin();
				
				}
				
			}
				
			
		}, cancel: function() {
			
			closeLogin();
			
		},  handleLoginCallback: function() {
			
			if (window.location.hash) {
	
				var message = window.location.hash.substr(1);
				var nvps = message.split('&');
				for (var nvp in nvps) {
				    var parts = nvps[nvp].split('=');
				    if (parts[0] == 'id') {
						SFIDWidget.openid = decodeURIComponent(parts[1]);
				    } else if (parts[0] == 'access_token') {
						SFIDWidget.access_token = parts[1];
					} else if (parts[0] == 'state') {
						if (parts[1] != null) 
						if (SFIDWidget.config.mode == 'popup-callback') {
							if (parts[1] != null) SFIDWidget_loginHandler = decodeURIComponent(parts[1]);
						} else {
							SFIDWidget.config.startURL = decodeURIComponent(parts[1]);
						}
					}
				}
				var openidScript = document.createElement('script');
				openidScript.setAttribute('src', SFIDWidget.openid + '?version=latest&callback=SFIDWidget_handleOpenIDCallback&access_token=' + SFIDWidget.access_token);
				document.head.appendChild(openidScript);
	
			}
			
		},  redirectToStartURL: function() {
			
			if (SFIDWidget.config.mode == 'popup-callback') {
				window.opener.SFIDWidget.openid_response = SFIDWidget.openid_response;
				window.opener[SFIDWidget_loginHandler](SFIDWidget.openid_response);
				window.close();
			} else if ((SFIDWidget.config.mode == 'modal-callback') || (SFIDWidget.config.mode == 'inline-callback')) {
				if ((SFIDWidget.config.startURL) && (SFIDWidget.config.startURL.toLowerCase().indexOf('http') == 0)) {
					alert('You may only use paths for your startURL.');
					return null;
				} else {
					window.location = SFIDWidget.config.startURL;
				}
			
			} 
			
			
		}, logout: function() {
			
			if (SFIDWidget.openid_response != null) {
				var revokeURL =  SFIDWidget.config.communityURL + '/services/oauth2/revoke?callback=SFIDWidget_handleRevokeCallback&token=' + SFIDWidget.openid_response.access_token;
				var openidScript = document.createElement('script');
				openidScript.setAttribute('src', revokeURL);
				document.head.appendChild(openidScript);
			}
				
			SFIDWidget.expireToken({callback:SFIDWidget_handleExpireCallback});
			
			var ifrm = document.createElement('iframe');
			ifrm.setAttribute('src', SFIDWidget.config.communityURL + '/secur/logout.jsp');
			ifrm.className = 'sfid-logout';
			ifrm.onload = function() {
			    this.parentNode.removeChild(this);  
				console.log('idp session was invalidated');
			};
			document.body.appendChild(ifrm);
			
			
		},
		setToken: callExtend,
		getToken: callRetrieve,
		expireToken: callExpire,
		disabled: unsupported // boolean, NOT a function
	}

}();

function SFIDWidget_handleOpenIDCallback(response) {
	response.access_token = SFIDWidget.access_token;
	SFIDWidget.openid_response = response;
	var encodedResponse = btoa(JSON.stringify(response));
	SFIDWidget.setToken({
		  token: encodedResponse, 
	      expire: 1589249349000, 
	      extend: ["*"],
		  callback: SFIDWidget.redirectToStartURL,
		  session: true
	    });	
};

function SFIDWidget_handleRevokeCallback(response) {
	if (response.error != null) {
		console.log('access token was already invalid');
	} else {
		console.log('access token was revoked');
	}
};

function SFIDWidget_handleExpireCallback(response) {
	console.log('xauth token was expired: ' + response);
	SFIDWidget.access_token = null;
	SFIDWidget.openid = null;
	SFIDWidget.openid_response = null;
	SFIDWidget.config = null;
	SFIDWidget.authconfig = null;
	window[SFIDWidget_logoutHandler]();	
};


SFIDWidget.init();



