/*
 * This scripts expects a csv file to be placed in the Resources dir.  It will read columns as dicatated by the code below.
 * Then it will update the values of each project in ACS.
 */

var Cloud = require('ti.cloud');

var user = "csc";
var password = "1234";
var dirName = "Upload";
var newDirName = "New";

var MODE_DELETE = 1;
var MODE_UPLOAD = 2;
var MODE_NEW = 3;

var MODE = MODE_UPLOAD;

var CREATE_NEW_PROJ = 1;
var CREATE_NEW_DELETE_COLLECTION = 2;
var CREATE_NEW_COLLECTION = 3;
var CREATE_NEW_UPDATE_PROJ = 4;
var CREATE_NEW_PHOTOS = 5;

var projMap = {};
var colMap = {};
var numCollections = 0;
var numProjects = 0;
var numProjectsUpdated = 0;
var numCollectionsExpected = 0;
var numCollectionsDeleted = 0;

function updateProject(name) {
	var projectId = projMap[name];
	var collectionId = colMap[name];

	Cloud.Objects.update({
		id : projectId,
		classname : 'projects',
		fields : {
			collection_id : collectionId
		}
	}, function(e) {
		if (e.success) {
			var project = e.projects[0];
			numProjectsUpdated++;

			if (numCollectionsExpected == numProjectsUpdated) {

				createNew(CREATE_NEW_PHOTOS);
			}
		} else {
			Ti.API.info('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function createProject(name) {
	Cloud.Objects.create({
		classname : 'projects',
		fields : {
			name : name
		}
	}, function(e) {
		if (e.success) {
			numProjects++;
			var project = e.projects[0];
			var projName = project.name;
			var projId = project.id;
			projMap[projName] = projId;

			if (numCollectionsExpected == numProjects) {
				createNew(CREATE_NEW_COLLECTION);
			}

			Ti.API.info('Success:\n' + 'id: ' + project.id + '\n' + 'updated_at: ' + project.updated_at);
		} else {
			Ti.API.info('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function deletePhotoCollection(collectionName) {
	Cloud.PhotoCollections.remove({
		collection_id : "5345bf9f6e39500e6d001301"
	}, function(e) {
		numCollectionsDeleted++;
		if (e.success) {
			Ti.API.info("deleted collection ");
		} else {
			Ti.API.info('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
		if (numCollectionsExpected == numCollectionsDeleted) {
			Ti.API.info("creating collections " + numCollectionsExpected);
			createNew(CREATE_NEW_COLLECTION);
		}
	});
}

function createPhotoCollection(collectionName, projectId) {
	Cloud.PhotoCollections.create({
		name : collectionName,
		custom_fields : {
			project_id : projectId
		}
	}, function(e) {
		if (e.success) {
			numCollections++;
			var collection = e.collections[0];
			var colName = collection.name;
			var colId = collection.id;
			colMap[colName] = collection.id;

			if (numCollectionsExpected == numCollections) {
				createNew(CREATE_NEW_UPDATE_PROJ);
			}
		} else {
			Ti.API.info('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function isEmpty(map) {
	for (var key in map) {
		if (map.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

if ( typeof String.prototype.startsWith != 'function') {
	// see below for better implementation!
	String.prototype.startsWith = function(str) {
		return this.indexOf(str) == 0;
	};
}

function createNew(createNewType) {
	var newDir = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, newDirName);
	var files = newDir.getDirectoryListing();

	numCollectionsExpected = files.length;
	for (var i = 0; i < numCollectionsExpected; i++) {
		var file = files[i];

		if (createNewType == CREATE_NEW_DELETE_COLLECTION) {
			deletePhotoCollection(file);
		} else if (createNewType == CREATE_NEW_PROJ) {
			createProject(file);
		} else if (createNewType == CREATE_NEW_COLLECTION) {
			createPhotoCollection(file);
		} else if (createNewType == CREATE_NEW_UPDATE_PROJ) {
			updateProject(file);
		} else if (createNewType == CREATE_NEW_PHOTOS) {
			var dir = newDirName + "/" + file;

			var fileHandle = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dir);
			if (fileHandle.isDirectory()) {
				var collectionId = colMap[file];

				var lowerFileName = file.toLowerCase();
				if (lowerFileName.endsWith('.png') || lowerFileName.endsWith('.jpg')) {
					doCreatePhoto(fileHandle, dir, collectionId);
				}
			} else {
				alert("dir is not a dir:" + dir);
			}
		}
	}
}

function readUploadDir(projects) {
	if (MODE == MODE_NEW) {
		createNew(CREATE_NEW_PROJ);
	} else {
		var uploadDir = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dirName);

		if (!uploadDir.exists()) {
			alert("did not find directory " + dirName);
		} else {
			var files = uploadDir.getDirectoryListing();

			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var dir = dirName + "/" + file;

				var fileHandle = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dir);
				if (fileHandle.isDirectory()) {
					var fileNameLen = file.length;
					var underIndex = file.indexOf("_");
					var projId = file.substring(0, underIndex);
					var projName = file.substring(underIndex, fileNameLen);

					var matched = false;

					//Loop through all the projects to find a match
					for (var j = 0; j < projects.length; j++) {
						var project = projects[j];
						var projectId = project.id;
						if (projId == projectId) {
							matched = true;
							if (MODE == MODE_DELETE) {
								deletePhotosFromCollection(collectionId);
							} else if (MODE == MODE_UPLOAD) {
								var collectionId = project.collection_id;
								doCreatePhoto(fileHandle, dir, collectionId);
							}

							break;
						}
					}
					if (!matched) {
						Ti.API.info("No match for projId " + projId + " projName = " + projName);
					}
				}
			}
		}
	}
	Ti.API.info("Done!");
}

function doCreatePhoto(fileHandle, dir, collectionId) {
	var imageFiles = fileHandle.getDirectoryListing();
	for (var k = 0; k < imageFiles.length; k++) {
		var imageFile = imageFiles[k];

		var absImageFile = dir + "/" + imageFile;
		var imageHandle = Titanium.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, absImageFile);
		var imageData = imageHandle.read();

		var lowerFileName = imageFile.toLowerCase();
		if (lowerFileName.startsWith('featured')) {
			createPhoto(imageData, collectionId, 'true');
		} else {
			createPhoto(imageData, collectionId);
		}
	}
}

function doClick(e) {
	function getProjectsCallback(projectsCallback) {
		if (projectsCallback.success) {
			readUploadDir(projectsCallback.projects);
		}
	}

	function loginCallBack(logincallback) {
		if (logincallback.success) {
			getProjects(getProjectsCallback);
		} else {
			alert('It seems your password is outdated in ACS, please send an email to pbryzek@csc.com.');
		}
	}

	loginUser(user, password, loginCallBack);
}

function createPhoto(photoData, collectionId) {
	Cloud.Photos.create({
		photo : photoData,
		collection_id : collectionId
	}, function(e) {
		if (e.success) {
		} else {
			Ti.API.info('Error:\\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function createPhoto(photoData, collectionId, featuredVal) {
	Cloud.Photos.create({
		photo : photoData,
		collection_id : collectionId,
		custom_fields : {
			featured : featuredVal
		}

	}, function(e) {
		if (e.success) {
			Ti.API.info(JSON.stringify(e));
		} else {
			alert('Error:\\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function deletePhotosFromCollection(collectionId) {
	Cloud.Photos.query({
		collection_id : collectionId,
		per_page : 1000
	}, function(e) {
		if (e.success) {
			var photos = e.photos;
			//Delete all images associated with that collection
			numPhotosToDelete = photos.length;
			for (var k = 0; k < numPhotosToDelete; k++) {
				var photo = photos[k];
				var photoId = photo.id;
				removePhoto(photoId);
			}

		} else {
			alert('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function getProjects(callback) {
	Cloud.Objects.query({
		classname : 'projects',
		per_page : 100
	}, function(e) {
		callback(e);
	});
}

function removePhoto(photoId) {
	Cloud.Photos.remove({
		photo_id : photoId
	}, function(e) {
		if (e.success) {
		} else {
			alert('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
		}
	});
}

function loginUser(user, password, callback) {
	Cloud.Users.login({
		login : user,
		password : password
	}, function(e) {
		callback(e);
	});
}

$.index.open();

if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
	var touchTestModule = undefined;
	try {
		touchTestModule = require("com.soasta.touchtest");
	} catch (tt_exception) {
		Ti.API.error("com.soasta.touchest module is required");
	}

	var cloudTestURL = Ti.App.getArguments().url;
	if (cloudTestURL != null) {
		// The URL will be null if we don't launch through TouchTest.
		touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
	}

	Ti.App.addEventListener('resumed', function(e) {
		// Hook the resumed from background
		var cloudTestURL = Ti.App.getArguments().url;
		if (cloudTestURL != null) {
			touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
		}
	});
}