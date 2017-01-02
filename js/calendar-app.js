var myAppModule = angular.module('App', ['ui.rCalendar', 'ngToast', 'ui.bootstrap', 'ngStorage']);

//myAppModule.config(['$httpProvider', function($httpProvider) {
//        $httpProvider.defaults.useXDomain = true;
//        delete $httpProvider.defaults.headers.common['X-Requested-With'];
//    }
//]);

myAppModule.run(function($rootScope, $sessionStorage){
    $rootScope.$storage = $sessionStorage;
});

myAppModule.controller('CalendarCtrl', ['$scope', '$rootScope', '$http', '$sce', 'ngToast', function ($scope, $rootScope, $http, $sce, $ngToast, $sessionStorage) {
    'use strict';
    $scope.changeMode = function (mode) {
        $scope.mode = mode;
    };

    $scope.today = function () {
        $scope.currentDate = new Date();
    };

    $scope.initEvents = function () {
        $http.get('http://localhost:5000/reservations')
            .then(function(response) {
                $scope.displayEvents(response.data);
            }, function() {
                $scope.showErrorToast("Cannot load reservations, please try again later!");
            }
        );
    }

    $scope.isAuthenticated = function() {
        return $rootScope.$storage.isAuthenticated;
    }

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

    $scope.addEvent = function() {
        var allDay = false;
        if( $scope.allDay ){
            allDay = true;
        }
        var event = { title: $scope.title, startTime: new Date($scope.startDate), endTime: new Date($scope.endDate), allDay: allDay, description: $scope.description, userId: 1};
        $http.post('http://localhost:5000/reservations',JSON.stringify(event))
            .then(function(response) {
                event.id = response.data.id;
                $scope.addEventLocally(event);
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
        $scope.eventSource = events;
    }

    $scope.showInfoToast = function(message) {
        $ngToast.create(message);
    }

    $scope.showWarningToast = function(message){
        $ngToast.warning({
            content: $sce.trustAsHtml('<div class="warning-toast">' + message + '</div>'),
            timeout: 5000,
            dismissOnClick: false,
            dismissButton: true
        });
    }

    $scope.showErrorToast = function(message){
        $ngToast.danger({
            content: $sce.trustAsHtml('<div class="error-toast">' + message + '</div>'),
            timeout: 10000,
            dismissOnClick: false,
            dismissButton: true
        });
    }

    $rootScope.$on('login-success-event', function(event){
        var base_auth_string = 'Basic ' + window.btoa($rootScope.$storage.token + ':unused');
        $http.defaults.headers.common.Authorization = base_auth_string;
    });

    $rootScope.$on('logout-event', function(event){
        $http.defaults.headers.common.Authorization = undefined;
    });

}]);

myAppModule.controller('loginController', function($scope, $uibModal, $rootScope, $http, ngToast, $sce, $sessionStorage) {

    $scope.logout= function() {
        $rootScope.$storage.isAuthenticated = false;
        $rootScope.$storage.token = undefined;
        $rootScope.$broadcast('logout-event')
    }

	$scope.showLogin = function() {
		$rootScope.loginModal = $uibModal.open({
            templateUrl: "./templates/login-modal.html",
            controller: "loginController"
		});
	};

	$scope.showRegister = function() {
		$rootScope.registerModal = $uibModal.open({
            templateUrl: "./templates/register-modal.html",
            controller: "loginController"
		});
	};

    $scope.cancelLogin = function() {
        if($rootScope.loginModal){
            $rootScope.loginModal.dismiss("User canceled");
        }
    }

    $scope.cancelRegister = function() {
        if($rootScope.registerModal){
            $rootScope.registerModal.dismiss("User canceled");
        }
    }


    $scope.authenticate = function() {
        var username = $scope.username;
        var password = $scope.password;
        var base64_creds = window.btoa(username + ":" + password);
        var req = {
         method: 'GET',
         url: 'http://localhost:5000/token',
         headers: {
           'Authorization': 'Basic ' + base64_creds
         }
        }
        $http(req)
            .then(function(response) {
                if(response.data && response.data.token) {
                    ngToast.create("Login success!");
                    console.log(response.data.token);
                    $rootScope.loginModal.close("Successful login");
                    $rootScope.$storage.token = response.data.token;
                    $rootScope.$storage.isAuthenticated = true;
                    $rootScope.$broadcast('login-success-event');
                }
            }, function(response) {
                if( response ){
                    $scope.showErrorToast("Login Failed:<br>" + response.status + ": " + response.data + "!");
                }
                else{
                    $scope.showErrorToast("Login Failed!");
                }
            }
        );
    }

    $scope.showErrorToast = function(message){
        ngToast.danger({
            content: $sce.trustAsHtml('<div class="error-toast">' + message + '</div>'),
            timeout: 10000,
            dismissOnClick: false,
            dismissButton: true
        });
    }

    $scope.isAuthenticated = function() {
        return $rootScope.$storage.isAuthenticated;
    }

});