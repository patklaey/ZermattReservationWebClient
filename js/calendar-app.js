var myAppModule = angular.module('App', ['ui.rCalendar']);
myAppModule.controller('CalendarCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
    'use strict';
    $scope.changeMode = function (mode) {
        $scope.mode = mode;
    };

    $scope.today = function () {
        $scope.currentDate = new Date();
    };

    $scope.initEvent = function () {
        var events = [];
        events.push({ id: 1, title: "My event #1", startTime: new Date("December 12, 2016 12:00:00"), endTime: new Date("December 13, 2016 12:00:00"), allDay: false});
        $rootScope.eventSource = events;
        $rootScope.nextId = 2;
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
        $scope.event = event;
    };

    $scope.onTimeSelected = function (selectedTime) {
        console.log('Selected time: ' + selectedTime);
	console.log($scope.eventSource);
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