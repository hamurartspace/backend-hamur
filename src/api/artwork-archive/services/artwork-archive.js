'use strict';

/**
 * artwork-archive service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::artwork-archive.artwork-archive');
