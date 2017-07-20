# OctoPrint-AppAuth

Adds a mechanism to let applications request access to the API, letting a logged in user on the OctoPrint
interface decide if the access is granted or denied.

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/fieldOfView/OctoPrint-AppAuth/archive/master.zip

## Configuration

There is no configuration.

## Use

An application creates a globally unique client key, and uses that to request access to OctoPrint on the
following endpoint: ```plugin/appauth/request```. This endpoint has the following parameters:

```clientkey``` (required): a globally unique identifier of the application instance
```appname``` (optional): the name of the application, as shown to the Octoprint user
```username``` (optional): the name of the user requesting access, as shown to the OctoPrint user

eg:
```http://octopi.local:5000/plugin/appauth/request?clientkey=15ec1ddf-ed68-4314-916e-14302530ea02&appname=MyApplication&username=fieldOfView```

The request results in a message popping up on any OctoPrint instance that is currently open. The request 
must be periodically repeated, until an admin user on the OctoPrint instance presses either "Allow" or 
"Deny".

![Access Request dialog](https://github.com/fieldOfView/OctoPrint-AppAuth/blob/master/screenshots/auth_request.png)

A client shall periodically GET the endpoint, until the response code is either 403 or 200.

Until a decision is made, the request to the endpoint gets a response with HTTP code 202 and the text
"Awaiting a decision". If the user chooses to deny access, the response will be HTTP code 403 "Access 
denied". Finally, if the user chooses to allow access, the response will be an HTTP code 200, and the
response text will be the API key.