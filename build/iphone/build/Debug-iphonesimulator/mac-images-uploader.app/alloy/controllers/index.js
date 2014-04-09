function Controller() {
    function updateProject(name) {
        var projectId = projMap[name];
        var collectionId = colMap[name];
        Cloud.Objects.update({
            id: projectId,
            classname: "projects",
            fields: {
                collection_id: collectionId
            }
        }, function(e) {
            if (e.success) {
                e.projects[0];
                numProjectsUpdated++;
                numCollectionsExpected == numProjectsUpdated && createNew(CREATE_NEW_PHOTOS);
            } else Ti.API.info("Error:\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function createProject(name) {
        Cloud.Objects.create({
            classname: "projects",
            fields: {
                name: name
            }
        }, function(e) {
            if (e.success) {
                numProjects++;
                var project = e.projects[0];
                var projName = project.name;
                var projId = project.id;
                projMap[projName] = projId;
                numCollectionsExpected == numProjects && createNew(CREATE_NEW_COLLECTION);
                Ti.API.info("Success:\nid: " + project.id + "\n" + "updated_at: " + project.updated_at);
            } else Ti.API.info("Error:\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function deletePhotoCollection() {
        Cloud.PhotoCollections.remove({
            collection_id: "5345bf9f6e39500e6d001301"
        }, function(e) {
            numCollectionsDeleted++;
            e.success ? Ti.API.info("deleted collection ") : Ti.API.info("Error:\n" + (e.error && e.message || JSON.stringify(e)));
            if (numCollectionsExpected == numCollectionsDeleted) {
                Ti.API.info("creating collections " + numCollectionsExpected);
                createNew(CREATE_NEW_COLLECTION);
            }
        });
    }
    function createPhotoCollection(collectionName, projectId) {
        Cloud.PhotoCollections.create({
            name: collectionName,
            custom_fields: {
                project_id: projectId
            }
        }, function(e) {
            if (e.success) {
                numCollections++;
                var collection = e.collections[0];
                var colName = collection.name;
                collection.id;
                colMap[colName] = collection.id;
                numCollectionsExpected == numCollections && createNew(CREATE_NEW_UPDATE_PROJ);
            } else alert("Error:\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function createNew(createNewType) {
        var newDir = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, newDirName);
        var files = newDir.getDirectoryListing();
        numCollectionsExpected = files.length;
        for (var i = 0; numCollectionsExpected > i; i++) {
            var file = files[i];
            if (createNewType == CREATE_NEW_DELETE_COLLECTION) deletePhotoCollection(file); else if (createNewType == CREATE_NEW_PROJ) createProject(file); else if (createNewType == CREATE_NEW_COLLECTION) createPhotoCollection(file); else if (createNewType == CREATE_NEW_UPDATE_PROJ) updateProject(file); else if (createNewType == CREATE_NEW_PHOTOS) {
                var dir = newDirName + "/" + file;
                var fileHandle = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dir);
                if (fileHandle.isDirectory()) {
                    var collectionId = colMap[file];
                    var lowerFileName = file.toLowerCase();
                    (lowerFileName.endsWith(".png") || lowerFileName.endsWith(".jpg")) && doCreatePhoto(fileHandle, dir, collectionId);
                } else alert("dir is not a dir:" + dir);
            }
        }
    }
    function readUploadDir(projects) {
        if (MODE == MODE_NEW) createNew(CREATE_NEW_PROJ); else {
            var uploadDir = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dirName);
            if (uploadDir.exists()) {
                var files = uploadDir.getDirectoryListing();
                for (var i = 0; files.length > i; i++) {
                    var file = files[i];
                    var dir = dirName + "/" + file;
                    var fileHandle = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, dir);
                    if (fileHandle.isDirectory()) {
                        var fileNameLen = file.length;
                        var underIndex = file.indexOf("_");
                        var projId = file.substring(0, underIndex);
                        var projName = file.substring(underIndex, fileNameLen);
                        var matched = false;
                        for (var j = 0; projects.length > j; j++) {
                            var project = projects[j];
                            var projectId = project.id;
                            if (projId == projectId) {
                                matched = true;
                                if (MODE == MODE_DELETE) deletePhotosFromCollection(collectionId); else if (MODE == MODE_UPLOAD) {
                                    var collectionId = project.collection_id;
                                    doCreatePhoto(fileHandle, dir, collectionId);
                                }
                                break;
                            }
                        }
                        matched || Ti.API.info("No match for projId " + projId + " projName = " + projName);
                    }
                }
            } else alert("did not find directory " + dirName);
        }
        Ti.API.info("Done!");
    }
    function doCreatePhoto(fileHandle, dir, collectionId) {
        var imageFiles = fileHandle.getDirectoryListing();
        for (var k = 0; imageFiles.length > k; k++) {
            var imageFile = imageFiles[k];
            var absImageFile = dir + "/" + imageFile;
            var imageHandle = Titanium.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, absImageFile);
            var imageData = imageHandle.read();
            var lowerFileName = imageFile.toLowerCase();
            lowerFileName.startsWith("featured") ? createPhoto(imageData, collectionId, "true") : createPhoto(imageData, collectionId);
        }
    }
    function doClick() {
        function getProjectsCallback(projectsCallback) {
            projectsCallback.success && readUploadDir(projectsCallback.projects);
        }
        function loginCallBack(logincallback) {
            logincallback.success ? getProjects(getProjectsCallback) : alert("It seems your password is outdated in ACS, please send an email to pbryzek@csc.com.");
        }
        loginUser(user, password, loginCallBack);
    }
    function createPhoto(photoData, collectionId) {
        Cloud.Photos.create({
            photo: photoData,
            collection_id: collectionId
        }, function(e) {
            e.success || alert("Error:\\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function createPhoto(photoData, collectionId, featuredVal) {
        Cloud.Photos.create({
            photo: photoData,
            collection_id: collectionId,
            custom_fields: {
                featured: featuredVal
            }
        }, function(e) {
            e.success ? Ti.API.info(JSON.stringify(e)) : alert("Error:\\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function deletePhotosFromCollection(collectionId) {
        Cloud.Photos.query({
            collection_id: collectionId,
            per_page: 1e3
        }, function(e) {
            if (e.success) {
                var photos = e.photos;
                numPhotosToDelete = photos.length;
                for (var k = 0; numPhotosToDelete > k; k++) {
                    var photo = photos[k];
                    var photoId = photo.id;
                    removePhoto(photoId);
                }
            } else alert("Error:\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function getProjects(callback) {
        Cloud.Objects.query({
            classname: "projects",
            per_page: 100
        }, function(e) {
            callback(e);
        });
    }
    function removePhoto(photoId) {
        Cloud.Photos.remove({
            photo_id: photoId
        }, function(e) {
            e.success || alert("Error:\n" + (e.error && e.message || JSON.stringify(e)));
        });
    }
    function loginUser(user, password, callback) {
        Cloud.Users.login({
            login: user,
            password: password
        }, function(e) {
            callback(e);
        });
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "index";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    var __defers = {};
    $.__views.index = Ti.UI.createWindow({
        backgroundColor: "white",
        id: "index"
    });
    $.__views.index && $.addTopLevelView($.__views.index);
    $.__views.label = Ti.UI.createButton({
        title: "Upload Images to ACS?",
        id: "label"
    });
    $.__views.index.add($.__views.label);
    doClick ? $.__views.label.addEventListener("click", doClick) : __defers["$.__views.label!click!doClick"] = true;
    exports.destroy = function() {};
    _.extend($, $.__views);
    var Cloud = require("ti.cloud");
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
    "function" != typeof String.prototype.startsWith && (String.prototype.startsWith = function(str) {
        return 0 == this.indexOf(str);
    });
    $.index.open();
    if ("iphone" === Ti.Platform.osname || "ipad" === Ti.Platform.osname) {
        var touchTestModule = void 0;
        try {
            touchTestModule = require("com.soasta.touchtest");
        } catch (tt_exception) {
            Ti.API.error("com.soasta.touchest module is required");
        }
        var cloudTestURL = Ti.App.getArguments().url;
        null != cloudTestURL && touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
        Ti.App.addEventListener("resumed", function() {
            var cloudTestURL = Ti.App.getArguments().url;
            null != cloudTestURL && touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
        });
    }
    __defers["$.__views.label!click!doClick"] && $.__views.label.addEventListener("click", doClick);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;