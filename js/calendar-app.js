var myAppModule = angular.module('App', ['ui.rCalendar', 'ngToast', 'ui.bootstrap', 'ngMaterial', 'ngMessages', 'ngCookies']);

myAppModule.config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }
]);

myAppModule.constant("CONFIG", {
    "API_ENDPOINT": "http://localhost:5000"
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

myAppModule.directive("datepicker", function () {
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

        elem.datetimepicker({
            inline: true,
            sideBySide: true,
            locale: 'de',
            toolbarPlacement: 'top',
            showClear: true,
            format: "DD.MM.YYYY HH:mm Z",
            showTodayButton: true
        });

        elem.on("dp.change",function (e) {
            updateModel(e);
        });
    }
}
});

myAppModule.run(function($rootScope, $http){

});

myAppModule.controller('CalendarCtrl', function ($scope, $rootScope, $http, $sce, ngToast, $timeout, CONFIG) {
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
        return $cookies.get("authenticated");
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
    };

    $scope.onTimeSelected = function (selectedTime) {
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
            startDate = moment().toDate();
        }

        if ($scope.event && $scope.event.endDate) {
            endDate = $scope.event.endDate;
        } else {
            endDate = moment().toDate();
        }

        if ($scope.event && $scope.event.allDay){
            allDay = true;
        }

        var event = { title: $scope.event.title, startTime: startDate, endTime: endDate, allDay: allDay, description: $scope.event.description};
        $scope.addEvent(event);
    };

    $scope.addEvent = function(event) {
        $http.post(CONFIG.API_ENDPOINT + '/reservations',JSON.stringify(event))
            .then(function(response) {
                event.id = response.data.id;
                $scope.showInfoToast("Event added!");
                $rootScope.reservationModal.close("Event added");
                $scope.addEventLocally(event);
                $rootScope.$broadcast('event-added');
            }, function(response) {
                if( response ){
                    $scope.showErrorToast("Could not add reservation:<br>" + response.status + ": " + response.data.error + "!");
                }
                else{
                    $scope.showErrorToast("Could not add reservation!");
                }
            }
        );
    };

    $scope.addEventLocally = function(event) {
        var events = $rootScope.eventSource;
        if( events == null || events == undefined ){
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

    $rootScope.$on('login-success-event', function(){
        var token = arguments[1];
        $http.defaults.headers.common.Authorization = 'Bearer ' + token;
    });

    $rootScope.$on('logout-event', function(){
        $http.defaults.headers.common.Authorization = undefined;
    });

    $rootScope.$on('event-added', function(){
        $scope.$broadcast('eventSourceChanged',$rootScope.eventSource);
    });

    $rootScope.$on('invalid-form-event', function(){
        $scope.showWarningToast("<strong>Please review your inputs</strong><br/>There are some errors in the form.");
    });

});

myAppModule.controller('headerController', function($scope, $uibModal, $rootScope, $http, ngToast, $sce, CONFIG, $cookies) {

    $scope.logout= function() {
        $cookies.remove("authenticated");
        $rootScope.$broadcast('logout-event')
    };

	$scope.showLogin = function() {
		$rootScope.loginModal = $uibModal.open({
            templateUrl: "./templates/login-modal.html",
            controller: "headerController"
		});
	};

	$scope.showRegister = function() {
		$rootScope.registerModal = $uibModal.open({
            templateUrl: "./templates/register-modal.html",
            controller: "headerController"
		});
	};

	$scope.showReservation = function(){
        $rootScope.reservationModal = $uibModal.open({
            templateUrl: "./templates/reservation-modal.html",
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

        $http.post(CONFIG.API_ENDPOINT + '/users',JSON.stringify(user))
            .then(function() {
                ngToast.create({
                    timeout: 10000,
                    content: $sce.trustAsHtml("Registration success!<br/>You should have received a mail with further information")
                });
                $rootScope.registerModal.close("Successful registration");
            }, function(response) {
                if( response ){
                    $scope.showErrorToast("Registration failed:<br/>" + response.status + ": " + response.data.error + "!");
                }
                else{
                    $scope.showErrorToast("Registration failed!");
                }
            }
        );
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
        $http(req)
            .then(function(response) {
                if(response.data && response.data.token) {
                    $scope.loginFailed = false;
                    ngToast.create("Login success!");
                    $scope.setupUser(response.data.token);
                    $rootScope.loginModal.close("Successful login");
                    $rootScope.$broadcast('login-success-event', response.data.token);
                }
            }, function(response) {
                if( response && response.data ) {
                    if( response.status == 401 ) {
                        $scope.loginFailed = true;
                    } else {
                        $scope.showErrorToast("Login Failed:<br/>" + response.data + "!");
                    }
                } else {
                    $scope.showErrorToast("An unknown error occured<br/>Please try again later or contact the administrator.");
                }
            }
        );
    };

    $scope.setupUser = function(token){
        var token_parts = token.split(".");
        var headers = JSON.parse(window.atob(token_parts[0]));
        var payload = JSON.parse(window.atob(token_parts[1]));
        $rootScope.username = payload.username;
        $cookies.put("username", payload.username);
        $cookies.put("authenticated",true);
        $cookies.put("isAdmin", payload.admin);
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
        return $scope.isAuthenticated() && $cookies.get("isAdmin");
    }

});