'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(generateBlogPostData());
    }

    return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph()
    };
}

function tearDownDb() {
    console.warn('Deleting database.');
    return mongoose.connection.dropDatabase();
}

describe('Blog Post API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;

                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body).to.have.lengthOf(count);
                });
        });

        it('should return blog posts with right fields', function() {
            let resBlogPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);

                    res.body.forEach(function(blogPost) {
                        expect(blogPost).to.be.a('object');
                        expect(blogPost).to.include.keys(
                            'id', 'author', 'content', 'title', 'created');
                    });
                    resBlogPost = res.body[0];
                    return BlogPost.findById(resBlogPost.id);
                })
                .then(function(blogPost) {
                    expect(resBlogPost.id).to.equal(blogPost.id);
                    expect(resBlogPost.author).to.equal(`${blogPost.author.firstName} ${blogPost.author.lastName}`);
                    expect(resBlogPost.content).to.equal(blogPost.content);
                    expect(resBlogPost.title).to.equal(blogPost.title);
                    expect(resBlogPost.created).to.equal(blogPost.created.toISOString());
                });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog post', function() {
            const newBlogPost = generateBlogPostData();

            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys(
                        'id', 'author', 'content', 'title', 'created');
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.author).to.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
                    expect(res.body.content).to.equal(newBlogPost.content);
                    expect(res.body.title).to.equal(newBlogPost.title);
                    expect(res.body.created).to.not.be.null;
                });
        });
    });

    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                content: faker.lorem.paragraph(),
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                }
            };

            return BlogPost
                .findOne()
                .then(function(blogPost) {
                    updateData.id = blogPost.id;

                    return chai.request(app)
                        .put(`/posts/${blogPost.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);

                    return BlogPost.findById(updateData.id);
                })
                .then(function(blogPost) {
                    expect(blogPost.author.firstName).to.equal(updateData.author.firstName);
                    expect(blogPost.author.lastName).to.equal(updateData.author.lastName);
                    expect(blogPost.content).to.equal(updateData.content);
                    expect(blogPost.title).to.equal(updateData.title);
                });
        });
    });

    describe('DELETE endpoint', function() {
        it('delete a blog post by id', function() {
            let blogPost;

            return BlogPost
                .findOne()
                .then(function(_blogPost) {
                    blogPost = _blogPost;
                    return chai.request(app).delete(`/posts/${blogPost.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(blogPost.id);
                })
                .then(function(_blogPost) {
                    expect(_blogPost).to.be.null;
                });

        });
    });
});