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
        $http.get('http://localhost:5000/reservations').
            then(function(response) {
                $scope.saveEvents(response.data);
        });
    }

    $scope.saveEvents = function (events) {
        var allEvents = [];
        for(var i = 0; i < events.length; i++){
            var data = events[i];
            allEvents.push({ id: data.id, title: data.title, startTime: new Date(data.start_date), endTime: new Date(data.end_date), allDay: data.all_day, description: data.description, userId: data.user_id });
        }
        $rootScope.eventSource = allEvents;
        $scope.loadEvents();
    }

    $scope.loadEvents = function () {
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
        console.log($scope.title + " " + $scope.startDate + " " + $scope.endDate);
        var events = $rootScope.eventSource;
        if( events == null || events == undefined ){
            events = [];
        }
        events.push({id: $rootScope.nextId, title: $scope.title, startTime: new Date($scope.startDate), endTime: new Date($scope.endDate), allDay: false});
        $rootScope.nextId = $rootScope.nextId + 1;
        $rootScope.eventSource = events;
        console.log(events);
    };

}]);

myAppModule.controller('loginController', function($scope) {
	$scope.login = function() {
		alert($scope.username + " " + $scope.password);
	};
});