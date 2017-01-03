var myAppModule = angular.module('App', ['ui.rCalendar', 'ngToast', 'ui.bootstrap', 'ngStorage', 'ngMaterial']);

myAppModule.config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }
]);

myAppModule.directive("datepicker", function () {
    return {
        restrict: "A",
        require: "ngModel",

        link: function (scope, elem, attrs, ngModelCtrl) {
            var updateModel = function () {

            scope.$apply(function () {
                ngModelCtrl.$modelValue = elem.val();
                var ngModelNameArray = elem["0"].attributes["ng-model"].value.split(".");
                scope[ngModelNameArray[0]][ngModelNameArray[1]] = elem.val();
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
            updateModel();
        });
    }
}
});

myAppModule.run(function($rootScope, $sessionStorage, $http){
    $rootScope.$storage = $sessionStorage;
    if($rootScope.$storage.token){
        var base_auth_string = 'Basic ' + window.btoa($rootScope.$storage.token + ':unused');
        $http.defaults.headers.common.Authorization = base_auth_string;
    }
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

    $scope.addReservation = function() {
        var startDate = moment($scope.event.startDate, "DD.MM.YYYY HH:mm Z").toDate();
        var endDate = moment($scope.event.endDate, "DD.MM.YYYY HH:mm Z").toDate();
        console.log("Title: " + $scope.event.title + ", Desc; " + $scope.event.description + ", Start: " + startDate + ", End: " + endDate);
        var event = { title: $scope.event.title, startTime: startDate, endTime: endDate, allDay: false, description: $scope.event.description, userId: 1};
        $scope.addEvent(event);
    };

    $scope.addEvent = function(event) {
        $http.post('http://localhost:5000/reservations',JSON.stringify(event))
            .then(function(response) {
                event.id = response.data.id;
                $scope.showInfoToast("Event added!");
                $rootScope.$broadcast("event-add-success");
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

    $scope.cancelReservation = function() {
        if($rootScope.reservationModal){
            $rootScope.reservationModal.dismiss("User canceled");
        }
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

    $rootScope.$on("event-add-success", function(event){
        $rootScope.reservationModal.close("Event added");
    });

}]);

myAppModule.controller('headerController', function($scope, $uibModal, $rootScope, $http, ngToast, $sce, $sessionStorage) {

    $scope.logout= function() {
        $rootScope.$storage.isAuthenticated = false;
        $rootScope.$storage.token = undefined;
        $rootScope.$broadcast('logout-event')
    }

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
            controller: "CalendarCtrl"
        });
	}

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