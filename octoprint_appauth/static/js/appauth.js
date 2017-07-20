$(function() {
    function AppAuthViewModel(parameters) {
        var self = this;
        self.loginState = parameters[0];

        self.openRequests = {};

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "appauth") {
                return;
            }

            if (data.type == "request_access" && self.loginState.isAdmin()) {
                // Called when a access request is received through the plugin
                // Show a dialog to the user to grant or deny access

                if(data.client_key === undefined) {
                    // incomplete message
                    return;
                }

                if(self.openRequests[data.client_key] !== undefined) {
                    // request for this client is already showing, no need to show another one
                    return;
                }

                var message = gettext("Someone has requested access to control OctoPrint through the API");
                if (data.application_name != "" && data.user_name != "") {
                    message = _.sprintf(gettext("%(user_name)s has requested access to control OctoPrint from %(application_name)s"), 
                                        {user_name: data.user_name, application_name: data.application_name}
                    );
                }

                self.openRequests[data.client_key] = new PNotify({
                    title: gettext('Access Request'),
                    text: message,
                    hide: false,
                    confirm: {
                        confirm: true,
                        buttons: [{
                            text: gettext("Allow"),
                            click: function(notice) {
                                self.handleAccessDecision(notice, true);
                            }
                        }, {
                            text: gettext("Deny"),
                            click: function(notice) {
                                self.handleAccessDecision(notice, false);
                            }
                        }]
                    },
                    buttons: {
                        sticker: false,
                        closer: false
                    }
                });
            } else if (data.type == "end_request") {
                // Called when a access decision is made on any open OctoPrint instance
                // Hides the dialog on all other instances

                if(data.client_key === undefined) {
                    // incomplete message
                    return;
                }
                    
                if(self.openRequests[data.client_key] !== undefined) {
                    // another instance responded to the access request before the current user did

                    self.openRequests[data.client_key].remove();
                    delete self.openRequests[data.client_key]
                }
            }
        }

        self.handleAccessDecision = function(notice, access_granted) {
            // Called by access dialog when the user presses "Allow" or "Deny"
            // Hides the dialog and informs the server of the decision
            notice.remove();

            var client_key = "";
            var index = Object.values(self.openRequests).indexOf(notice);
            if (index >= 0) {
                client_key = Object.keys(self.openRequests)[index];
                delete self.openRequests[client_key];
            } else {
                return;
            }


            if (!self.loginState.isAdmin()) return;

            var url = PLUGIN_BASEURL + "appauth/decision";

            var payload = {
                command: "decision",
                client_key: client_key,
                access_granted: access_granted
            };

            $.ajax({
                url: url,
                type: "POST",
                dataType: "json",
                data: JSON.stringify(payload),
                contentType: "application/json; charset=UTF-8",
            });
        }
    }

    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    ADDITIONAL_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        AppAuthViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        ["loginStateViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        []
    ]);
});
