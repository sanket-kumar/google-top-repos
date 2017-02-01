/**
 * Created by Sanket on 2/1/17.
 */
var constants   = require('./constants');
var Promise     = require('bluebird');
var request     = require('request');

exports.topGoogleRepos = topGoogleRepos;

function topGoogleRepos(req, res) {
    Promise.coroutine(function *() {
            var repoUrl = config.get("githubRepo") + constants.googleRepoData.FETCH_REPO_DATA;
            console.log(" ##### Fetching Repos #####");
            var repoData = yield fetchRepoData(repoUrl, [], 1);
            var topRepoCount = constants.googleRepoData.TOP_REPO_COUNT;
            var filteredTopRepos = yield filterTopRepos(repoData);
            filteredTopRepos = filteredTopRepos.splice(0, topRepoCount);
            for(var i=0; i<topRepoCount; i++) {
                yield removeExtraKeys(filteredTopRepos[i]);
                yield findTopCommittees(filteredTopRepos[i]);
            }
            return filteredTopRepos;
        })()
        .then((result) => {
            res.send(result);
        }, (error) => {
            console.log("Error Occurred :: ", error.message);
            res.send("Sorry! Something went wrong");
        });
}

function fetchRepoData(repoUrl, data, counter) {
    return new Promise((resolve, reject) => {
        var options = {
            url     : repoUrl + `?page=${counter}`,
            method  : 'GET',
            rejectUnauthorized : false,
            timeout : 15000,
            headers: {
                'User-Agent': 'request',
                'authorization': 'Basic c2Fua2V0LWt1bWFyOjc4NTFiZDQwZDM0MWFmMTMyMjNjMTU0NjY1NmVlMDk2NjVlZjFiMTE='
            }
        };
        request(options, function(error, response, body){
            if(error || !body){
                error = error || new Error("Something went wrong while fetching data");
                return reject(error);
            }
            var responseBody;
            try {
                responseBody = JSON.parse(body);
            } catch(error) {
                return reject(error);
            }
            if(typeof responseBody.length == 'undefined') {
                console.log(body);
            }
            if(responseBody.length == 0 || counter > 1) {
                resolve(data);
            } else {
                data = data.concat(responseBody);
                fetchRepoData(repoUrl, data, counter+1).then((result) => {
                    resolve(result);
                }, (error) => {
                    reject(error);
                })
            }
        });
    });
}

function filterTopRepos(repoData) {
    return new Promise((resolve, reject) => {
        repoData.sort(function(a, b) {
            return parseInt(b.forks_count) - parseInt(a.forks_count);
        });
        resolve(repoData);
    })
}

function findTopCommittees(filteredTopRepo) {
    return new Promise((resolve, reject) => {
        var commitUrl = filteredTopRepo.commits_url.slice(0, -6);
        Promise.coroutine(function *() {
                console.log(" ##### Fetching Commits #####");
                var commits = yield fetchAllCommits(commitUrl, [], 1);
                console.log("Commits Length :: ", commits.length);
                var topCommittees = yield filterAuthorBasedCommits(commits);
                console.log(topCommittees);
                filteredTopRepo.topCommittee = topCommittees;
                return;
            })()
            .then((result) => resolve(), (error) => {
                reject(error)
            })
    })
}

function removeExtraKeys(filteredTopRepo) {
    return new Promise((resolve, reject) => {
        var impKeys = ["id", "name", "description", "commits_url", "forks_count"];
        for(var key in filteredTopRepo) {
            if(impKeys.indexOf(key) == -1) {
                delete filteredTopRepo[key];
            }
        }
        resolve();
    })
}

function fetchAllCommits(commitUrl, data, counter) {
    return new Promise((resolve, reject) => {
        var options = {
            url     : commitUrl + `?page=${counter}`,
            method  : 'GET',
            rejectUnauthorized : false,
            timeout : 15000,
            headers: {
                'User-Agent': 'request',
                'authorization': 'Basic c2Fua2V0LWt1bWFyOjc4NTFiZDQwZDM0MWFmMTMyMjNjMTU0NjY1NmVlMDk2NjVlZjFiMTE='
            }
        };
        request(options, function(error, response, body){
            if(error && error.code == 'ETIMEDOUT') {
                return fetchAllCommits.bind(null, commitUrl, data, counter);
            }
            if(error || !body){
                error = error || new Error("Something went wrong while fetching commit data");
                return reject(error);
            }
            var responseBody;
            try {
                responseBody = JSON.parse(body);
            } catch(error) {
                return reject(error);
            }
            if(responseBody.length == 0) {
                resolve(data);
            } else {
                data = data.concat(responseBody);
                fetchAllCommits(commitUrl, data, counter+1).then((result) => {
                    resolve(result);
                }, (error) => {
                    reject(error);
                })
            }
        });
    })
}

function filterAuthorBasedCommits(commits) {
    return new Promise((resolve, reject) => {
        var commitsObject = {};
        for(var i=0; i<commits.length; i++) {
            try {
                var authorId = commits[i]['commit']['author']['email'];
            } catch (err) {
                console.log(commits[i]);
                return reject(err);
            }
            if(commitsObject[authorId]) {
                commitsObject[authorId].count += 1;
            } else {
                commitsObject[authorId] = {
                    count : 1,
                    author : commits[i]['commit']['author']
                }
            }
        }
        var finalCommit = [];
        for(var key in commitsObject) {
            finalCommit.push(commitsObject[key]);
        }
        finalCommit.sort(function(a, b) {
            return parseInt(b.count) - parseInt(a.count);
        });

        finalCommit = finalCommit.splice(0, constants.googleRepoData.TOP_COMMITEES_COUNT);
        resolve(finalCommit);
    })
}