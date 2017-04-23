var myAppModule = angular.module('App', ['ui.rCalendar', 'ngToast', 'ui.bootstrap', 'ngMaterial', 'ngMessages', 'ngCookies', 'ngRoute', 'angularSpinners']);

myAppModule.config(['$httpProvider', '$routeProvider', function($httpProvider, $routeProvider) {
        $httpProvider.defaults.useXDomain = true;
        $httpProvider.defaults.withCredentials = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];

        $routeProvider
            .when("/users", {
                templateUrl: "templates/users.html"
            })
            .otherwise({
                templateUrl: "templates/calendar.html"
            });
    }
]);

myAppModule.constant("CONFIG", {
    "API_ENDPOINT": "http://localhost:5000"
});

myAppModule.constant("COOKIE_KEYS", {
    "USERNAME":"username",
    "AUTHENTICATED": "authenticated",
    "IS_ADMIN": "isAdmin",
    "USERID": "userId",
    "EXPIRE_DATE": "expireDate"
});

myAppModule.service('AuthService', function($http, CONFIG){
    this.checkUniqueValue = function(property, value) {
        return $http.get(CONFIG.API_ENDPOINT + "/users/checkUnique", {'params':{'key': property, 'value':value}}).then( function(result) {
            return result.data.unique;
        });
    }
});

myAppModule.directive("ngUnique", function(AuthService) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            element.bind('blur', function (e) {
            if (!ngModel || !element.val()) return;
                var keyProperty = scope.$eval(attrs.ngUnique);
                var currentValue = element.val();
                AuthService.checkUniqueValue(keyProperty.property, currentValue)
                    .then(function (unique) {
                        if (currentValue == element.val()) {
                            ngModel.$setValidity('unique', unique);
                            scope.$broadcast('show-errors-check-validity');
                        }
                });
            });
        }
    }
});

myAppModule.directive("compareTo", function() {
   return {
       require: "ngModel",
       scope: {
           otherModelValue: "=compareTo"
       },
       link: function(scope, element, attributes, ngModel) {

           ngModel.$validators.compareTo = function(modelValue) {
               return modelValue === scope.otherModelValue;
           };

           scope.$watch("otherModelValue", function() {
               ngModel.$validate();
           });
       }
   };
});

myAppModule.directive("datepicker", function ($rootScope) {
    return {
        restrict: "A",
        require: "ngModel",

        link: function (scope, elem, attrs, ngModelCtrl) {
            var updateModel = function (event) {

                scope.$apply(function () {
                    ngModelCtrl.$modelValue = elem.val();
                    var ngModelNameArray = elem["0"].attributes["ng-model"].value.split(".");
                    if(!scope.event){
                        scope.event = {};
                    }
                    scope.event[ngModelNameArray[1]] = event.date.toDate();
                });
            };

            var pickerDate = $rootScope.selectedDate;

            if( attrs.predefinedDate ){
                pickerDate = moment(attrs.predefinedDate, "YYYY-MM-DDTHH:mm:ss.SSSZ");
            }

            elem.datetimepicker({
                inline: true,
                sideBySide: true,
                locale: 'de',
                toolbarPlacement: 'top',
                showClear: true,
                defaultDate: pickerDate,
                format: "DD.MM.YYYY HH:mm Z",
                showTodayButton: true
            });

            elem.on("dp.change",function (e) {
                updateModel(e);
            });
        }
    }
});

myAppModule.run(function($rootScope, $cookies, COOKIE_KEYS){
    try {
        var exp = $cookies.getObject(COOKIE_KEYS.EXPIRE_DATE);
    } finally {
        var now = moment();
        if ( ! exp || now.isAfter(exp) ) {
            $rootScope.$broadcast("logout-event");
        } else {
            $rootScope.currentUser = {
                username: $cookies.get(COOKIE_KEYS.USERNAME),
                id: $cookies.get(COOKIE_KEYS.USERID)
            };
        }
        $rootScope.selectedDate = new Date();
    }
});

myAppModule.controller('CalendarCtrl', function ($scope, $rootScope, $uibModal, $http, $sce, ngToast, $timeout, CONFIG, COOKIE_KEYS, spinnerService) {
    'use strict';
    $scope.changeMode = function (mode) {
        $scope.mode = mode;
    };

    $scope.today = function () {
        $scope.currentDate = new Date();
    };

    $scope.initEvents = function () {
        $http.get(CONFIG.API_ENDPOINT + '/reservations')
            .then(function(response) {
                $scope.displayEvents(response.data);
            }, function() {
                $scope.showErrorToast("Cannot load reservations, please try again later!");
            }
        );
    };

    $scope.isAuthenticated = function() {
        return $cookies.get(COOKIE_KEYS.AUTHENTICATED);
    };

    $scope.displayEvents = function (events) {
        var allEvents = [];
        for(var i = 0; i < events.length; i++){
            var data = events[i];
            allEvents.push({ id: data.id, title: data.title, startTime: new Date(data.startTime), endTime: new Date(data.endTime), allDay: data.allDay, description: data.description, userId: data.userId });
        }
        $rootScope.eventSource = allEvents;
        $scope.eventSource = $rootScope.eventSource;
    };

    $scope.isToday = function () {
        var today = new Date(),
            currentCalendarDate = new Date($scope.currentDate);

        today.setHours(0, 0, 0, 0);
        currentCalendarDate.setHours(0, 0, 0, 0);
        return today.getTime() === currentCalendarDate.getTime();
    };

    $scope.onEventSelected = function (event) {
        $scope.currentEvent = event;
        $scope.showReservationModal = $uibModal.open({
            templateUrl: "./templates/modal/show-reservation-modal.html",
            scope: $scope,
            size: "lg"
        });
    };

    $scope.onTimeSelected = function (selectedTime) {
        $rootScope.selectedDate = selectedTime;
    };

    $scope.cancelEditReservation = function() {
        if($scope.showReservationModal){
            $scope.showReservationModal.dismiss("User canceled");
        }
    };

    $scope.updateReservation = function(){
        var eventToUpdate = {};
        if (this.event.startDate){
            eventToUpdate.startTime = this.event.startDate;
            $scope.currentEvent.startTime = this.event.startDate;
        }
        if (this.event.endDate){
            eventToUpdate.endTime = this.event.endDate;
            $scope.currentEvent.endTime = this.event.endDate;
        }

        $http.put(CONFIG.API_ENDPOINT + '/reservations/' + $scope.currentEvent.id,JSON.stringify(eventToUpdate))
            .then(function() {
                    $scope.showInfoToast("Event updated!");

                    $scope.showReservationModal.close();
                }, function(response) {
                    if( response ){
                        $scope.showErrorToast("Could not update event:<br>" + response.status + ": " + response.data.error + "!");
                    }
                    else{
                        $scope.showErrorToast("Could not update event!");
                    }
                }
            );

    };

    $scope.deleteReservation = function (reservationId) {
        alert("Deleting reservation " + reservationId);
    };

    $scope.addReservation = function() {
        angular.forEach($scope.reservationForm.$error.required, function(field) {
            field.$setTouched();
        });

        if ($scope.reservationForm.$invalid){
            $rootScope.$broadcast("invalid-form-event");
            return;
        }

        var startDate;
        var endDate;
        var allDay = false;

        if ($scope.event && $scope.event.startDate ){
            startDate = $scope.event.startDate;
        } else {
            startDate = $scope.selectedDate;
        }

        if ($scope.event && $scope.event.endDate) {
            endDate = $scope.event.endDate;
        } else {
            endDate = $scope.selectedDate;
        }

        if ($scope.event && $scope.event.allDay){
            allDay = true;
        }

        var event = { title: $scope.event.title, startTime: startDate, endTime: endDate, allDay: allDay, description: $scope.event.description};
        $scope.addEvent(event);
    };

    $scope.addEvent = function(event) {
        spinnerService.show('addReservationSpinner');
        $http.post(CONFIG.API_ENDPOINT + '/reservations',JSON.stringify(event))
            .success(function(response) {
                event.id = response.data.id;
                $scope.showInfoToast("Event added!");
                $rootScope.reservationModal.close("Event added");
                $scope.addEventLocally(event);
                $rootScope.$broadcast('event-added');
                spinnerService.show('addReservationSpinner');
            })
            .catch(function(response) {
                if( response ){
                    $scope.showErrorToast("Could not add reservation:<br>" + response.status + ": " + response.data.error + "!");
                }
                else{
                    $scope.showErrorToast("Could not add reservation!");
                }
            })
            .finally(function () {
                spinnerService.hide('addReservationSpinner');
            });
    };

    $scope.addEventLocally = function(event) {
        var events = $rootScope.eventSource;
        if( events === null || events === undefined ){
            events = [];
        }
        events.push(event);
        $rootScope.eventSource = events;
    };

    $scope.cancelReservation = function() {
        if($rootScope.reservationModal){
            $rootScope.reservationModal.dismiss("User canceled");
        }
    };

    $scope.showInfoToast = function(message) {
        ngToast.create(message);
    };

    $scope.showWarningToast = function(message){
        ngToast.warning({
            content: $sce.trustAsHtml('<div class="warning-toast">' + message + '</div>'),
            timeout: 5000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

    $scope.showErrorToast = function(message){
        ngToast.danger({
            content: $sce.trustAsHtml('<div class="error-toast">' + message + '</div>'),
            timeout: 10000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

    $rootScope.$on('event-added', function(){
        $scope.$broadcast('eventSourceChanged',$rootScope.eventSource);
    });

    $rootScope.$on('invalid-form-event', function(){
        $scope.showWarningToast("<strong>Please review your inputs</strong><br/>There are some errors in the form.");
    });

});


myAppModule.controller('userController', function($scope, $rootScope, $http, $sce, ngToast, CONFIG, $cookies, COOKIE_KEYS) {

    $scope.updateUser = function() {
        var userId = $scope.user.id;
        var newUser = {};

        if($scope.editUserForm.username.$dirty){
            newUser.username = $scope.user.username;
        }
        if($scope.editUserForm.email.$dirty){
            newUser.email = $scope.user.email;
        }
        if($scope.editUserForm.password.$dirty){
            newUser.password = $scope.user.password;
        }
        if($scope.editUserForm.active.$dirty){
            newUser.active = $scope.user.active;
        }
        if($scope.editUserForm.admin.$dirty){
            newUser.admin = $scope.user.admin;
        }

        $http.put(CONFIG.API_ENDPOINT + '/users/' + userId,JSON.stringify(newUser))
            .then(function() {
                $scope.showInfoToast("User updated!");
            }, function(response) {
                if( response ){
                    $scope.showErrorToast("Could not update user:<br>" + response.status + ": " + response.data.error + "!");
                }
                else{
                    $scope.showErrorToast("Could not update user!");
                }
            }
        );
    };

    $scope.deleteUser = function(){
        alert("Delete user " + $scope.user.id)
    };

    $scope.showInfoToast = function(message) {
        ngToast.create(message);
    };

    $scope.showErrorToast = function(message){
        ngToast.danger({
            content: $sce.trustAsHtml('<div class="error-toast">' + message + '</div>'),
            timeout: 10000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

    $scope.showWarningToast = function(message){
        ngToast.warning({
            content: $sce.trustAsHtml('<div class="warning-toast">' + message + '</div>'),
            timeout: 5000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

});


myAppModule.controller('headerController', function($scope, $uibModal, $rootScope, $http, ngToast, $sce, CONFIG, $cookies, COOKIE_KEYS, $location, spinnerService) {

    $rootScope.$on('logout-event', function(){
        $scope.logout();
    });

    $scope.logout= function() {
        $http.post(CONFIG.API_ENDPOINT + '/logout');
        $cookies.remove(COOKIE_KEYS.AUTHENTICATED);
        $cookies.remove(COOKIE_KEYS.USERNAME);
        $cookies.remove(COOKIE_KEYS.USERID);
        $cookies.remove(COOKIE_KEYS.IS_ADMIN);
        $rootScope.currentUser = undefined;
        $location.path("/");
    };

	$scope.showLogin = function() {
		$rootScope.loginModal = $uibModal.open({
            templateUrl: "./templates/modal/login-modal.html",
            controller: "headerController"
		});
	};

	$scope.showRegister = function() {
		$rootScope.registerModal = $uibModal.open({
            templateUrl: "./templates/modal/register-modal.html",
            controller: "headerController"
		});
	};

	$scope.showReservation = function(){
        $rootScope.reservationModal = $uibModal.open({
            templateUrl: "./templates/modal/new-reservation-modal.html",
            controller: "CalendarCtrl",
            size: "lg"
        });
	};

    $scope.cancelLogin = function() {
        if($rootScope.loginModal){
            $rootScope.loginModal.dismiss("User canceled");
        }
    };

    $scope.cancelRegister = function() {
        if($rootScope.registerModal){
            $rootScope.registerModal.dismiss("User canceled");
        }
    };

    $scope.register = function() {
        angular.forEach($scope.registerForm.$error.required, function(field) {
            field.$setTouched();
        });

        if ($scope.registerForm.$invalid){
            $rootScope.$broadcast("invalid-form-event");
            return;
        }

        var user = {
            username: $scope.user.username,
            password: $scope.user.password,
            email: $scope.user.email
        };

        spinnerService.show('registerSpinner');

        $http.post(CONFIG.API_ENDPOINT + '/users',JSON.stringify(user))
            .success(function() {
                ngToast.create({
                    timeout: 10000,
                    content: $sce.trustAsHtml("Registration success!<br/>You should have received a mail with further information")
                });
                $rootScope.registerModal.close();
            })
            .catch(function(response) {
                if( response ){
                    $scope.showErrorToast("Registration failed:<br/>" + response.status + ": " + response.data.error + "!");
                }
                else{
                    $scope.showErrorToast("Registration failed!");
                }
            })
            .finally(function() {
                spinnerService.hide('registerSpinner');
            });
    };

    $scope.authenticate = function() {
        $scope.loginFailed = false;
        angular.forEach($scope.loginForm.$error.required, function(field) {
            field.$setTouched();
        });

        if ($scope.loginForm.$invalid){
            $rootScope.$broadcast("invalid-form-event");
            return;
        }

        $scope.authenticateInBackend();
    };

    $scope.authenticateInBackend = function() {
        var username = $scope.username;
        var password = $scope.password;
        var base64_creds = window.btoa(username + ":" + password);
        var req = {
         method: 'GET',
         url: CONFIG.API_ENDPOINT + '/token',
         headers: {
           'Authorization': 'Basic ' + base64_creds
         }
        };

        spinnerService.show('loginSpinner');

        $http(req)
            .then(function(response) {
                if(response.data && response.data.token) {
                    $scope.loginFailed = false;
                    $scope.setupUser(response.data.token);
                    ngToast.create("<strong>Login success!</strong><br/>Hello " + $rootScope.currentUser.username);
                    $rootScope.loginModal.close("Successful login");
                }
                spinnerService.hide('loginSpinner');
            }, function(response) {
                if( response && response.data ) {
                    if( response.status === 401 ) {
                        $scope.loginFailed = true;
                    } else {
                        $scope.showErrorToast("Login Failed:<br/>" + response.data + "!");
                    }
                } else {
                    $scope.showErrorToast("An unknown error occured<br/>Please try again later or contact the administrator.");
                }
                spinnerService.hide('loginSpinner');
            }
        );
    };

    $scope.setupUser = function(token){
        var token_parts = token.split(".");
        var payload = JSON.parse(window.atob(token_parts[1]));
        $rootScope.currentUser = {
            username: payload.user_claims.username,
            id: payload.user_claims.userId
        };
        $cookies.put(COOKIE_KEYS.USERNAME, payload.user_claims.username);
        $cookies.put(COOKIE_KEYS.USERID, payload.user_claims.userId);
        $cookies.put(COOKIE_KEYS.AUTHENTICATED,true);
        $cookies.put(COOKIE_KEYS.IS_ADMIN, payload.user_claims.admin);
        $cookies.putObject(COOKIE_KEYS.EXPIRE_DATE, moment.unix(payload.exp))
    };

    $scope.showErrorToast = function(message){
        ngToast.danger({
            content: $sce.trustAsHtml('<div class="error-toast">' + message + '</div>'),
            timeout: 10000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

    $scope.showWarningToast = function(message){
        ngToast.warning({
            content: $sce.trustAsHtml('<div class="warning-toast">' + message + '</div>'),
            timeout: 5000,
            dismissOnClick: false,
            dismissButton: true
        });
    };

    $scope.isAuthenticated = function() {
        return $cookies.get("authenticated");
    };

    $scope.isAdmin = function(){
        return $scope.isAuthenticated() && $cookies.getObject(COOKIE_KEYS.IS_ADMIN);
    };

    $scope.showUsersButton = function(){
        return $scope.isAdmin() && $location.path() !== "/users";
    };

    $scope.showCalendarButton = function(){
        return $scope.isAdmin() && $location.path() === "/users";
    };

    $scope.showAddReservationButton = function(){
        return $scope.isAuthenticated() && $location.path() !== "/users";
    };

    $scope.$on("$routeChangeSuccess", function($currentRoute, $previousRoute) {
        if( $location.path() === '/users'){
            $http.get(CONFIG.API_ENDPOINT + '/users')
                        .then(function(response) {
                            $rootScope.allUsers = response.data;
                        }, function(response) {
                            if( response.data.error ){
                                $scope.showErrorToast("<strong>Cannot load users</strong><br/>" + response.data.error);
                            } else if( response.data.msg ){
                                $scope.showErrorToast("<strong>Cannot load users</strong><br/>Please login again to access this page");
                            } else {
                                $scope.showErrorToast("<strong>Cannot load users</strong><br/>Please try again or contact the administrator");
                            }
                            $location.path("/");
                        }
            );
        }
    });

});