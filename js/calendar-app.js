var myAppModule = angular.module('App', ['ui.rCalendar']);

myAppModule.config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }
]);

myAppModule.controller('CalendarCtrl', ['$scope', '$rootScope', '$http', function ($scope, $rootScope, $http) {
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
            }
        );
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
            }
        );
    };

    $scope.addEventLocally= function(event) {
        var events = $rootScope.eventSource;
        if( events == null || events == undefined ){
            events = [];
        }
        events.push(event);
        $rootScope.eventSource = events;
        $scope.eventSource = events;
    }

}]);

myAppModule.controller('loginController', function($scope) {
	$scope.login = function() {
		alert($scope.username + " " + $scope.password);
	};
});