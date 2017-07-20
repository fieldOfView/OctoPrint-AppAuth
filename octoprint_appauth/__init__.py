# coding=utf-8
from __future__ import absolute_import

import flask

import octoprint.plugin
from octoprint.settings import settings
from octoprint.server.util.flask import restricted_access, get_json_command_from_request
from octoprint.server import admin_permission, NO_CONTENT

class AppauthPlugin(octoprint.plugin.AssetPlugin,
					octoprint.plugin.BlueprintPlugin):


	_decisions = {}

	##-- AssetPlugin hooks
	def get_assets(self):
		return dict(js=["js/appauth.js"])

	##~~ BlueprintPlugin mixin
	@octoprint.plugin.BlueprintPlugin.route("/request", methods=["GET"])
	def handle_request(self):
		if not "clientkey" in flask.request.values:
			return flask.make_response("No client key provided", 400)

		client_key = flask.request.values["clientkey"]

		if client_key in self._decisions:
			if self._decisions.get(client_key, False):
				return settings().get(["api", "key"])
			else:
				return flask.make_response("Access denied", 403)

		self._plugin_manager.send_plugin_message(self._identifier, dict(
			type="request_access",
			client_key = flask.request.values["clientkey"],
			application_name = flask.request.values["appname"] if "appname" in flask.request.values else "",
			user_name = flask.request.values["username"] if "username" in flask.request.values else ""
		))
		return flask.make_response("Awaiting a decision", 202)


	@octoprint.plugin.BlueprintPlugin.route("/decision", methods=["POST"])
	@restricted_access
	@admin_permission.require(403)
	def handle_decision(self):
		valid_commands = {
			"decision": []
		}

		command, data, response = get_json_command_from_request(flask.request, valid_commands)
		if response is not None:
			return response

		client_key = data.get("client_key", "")
		if not client_key:
			return

		self._plugin_manager.send_plugin_message(self._identifier, dict(
			type="end_request",
			client_key = client_key
		))

		self._decisions[client_key] = data.get("access_granted", False);

		return NO_CONTENT


	def is_blueprint_protected(self):
		return False # No API key required to request API access


	##~~ Softwareupdate hook

	def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
		# for details.
		return dict(
			AppAuth=dict(
				displayName="AppAuth Plugin",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="fieldOfView",
				repo="OctoPrint-AppAuth",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/fieldOfView/OctoPrint-AppAuth/archive/{target_version}.zip"
			)
		)


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "AppAuth Plugin"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = AppauthPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}

