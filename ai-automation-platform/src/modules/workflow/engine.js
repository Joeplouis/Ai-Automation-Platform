/**
 * Task-Based Workflow Engine
 * Advanced workflow orchestration system with conditional logic, error handling, and monitoring
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class WorkflowEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxConcurrentWorkflows: config.maxConcurrentWorkflows || 10,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 5000,
            timeoutMs: config.timeoutMs || 300000, // 5 minutes
            ...config
        };
        
        this.workflows = new Map(); // Active workflows
        this.templates = new Map(); // Workflow templates
        this.tasks = new Map(); // Task definitions
        this.executors = new Map(); // Task executors
        this.history = new Map(); // Execution history
        this.metrics = new Map(); // Performance metrics
        
        // Initialize built-in tasks
        this.initializeBuiltInTasks();
        
        // Start monitoring
        this.startMonitoring();
    }

    // ===== WORKFLOW MANAGEMENT =====
    
    async createWorkflow(workflowData) {
        const workflowId = this.generateWorkflowId();
        
        const workflow = {
            id: workflowId,
            name: workflowData.name,
            description: workflowData.description,
            version: workflowData.version || '1.0.0',
            tasks: workflowData.tasks || [],
            variables: workflowData.variables || {},
            triggers: workflowData.triggers || [],
            schedule: workflowData.schedule || null,
            status: 'created',
            created: new Date(),
            updated: new Date(),
            execution: {
                startTime: null,
                endTime: null,
                duration: 0,
                currentTask: null,
                completedTasks: [],
                failedTasks: [],
                retryCount: 0,
                logs: []
            },
            metadata: workflowData.metadata || {}
        };
        
        // Validate workflow structure
        await this.validateWorkflow(workflow);
        
        this.workflows.set(workflowId, workflow);
        
        // Set up triggers
        if (workflow.triggers.length > 0) {
            await this.setupTriggers(workflowId);
        }
        
        // Schedule if needed
        if (workflow.schedule) {
            await this.scheduleWorkflow(workflowId);
        }
        
        this.emit('workflow:created', { workflowId, workflow });
        console.log(`✅ Workflow created: ${workflow.name} (${workflowId})`);
        
        return workflow;
    }
    
    async validateWorkflow(workflow) {
        const errors = [];
        
        // Check required fields
        if (!workflow.name) errors.push('Workflow name is required');
        if (!workflow.tasks || workflow.tasks.length === 0) {
            errors.push('Workflow must have at least one task');
        }
        
        // Validate tasks
        for (const task of workflow.tasks) {
            const taskErrors = await this.validateTask(task);
            errors.push(...taskErrors);
        }
        
        // Check for circular dependencies
        const circularDeps = this.detectCircularDependencies(workflow.tasks);
        if (circularDeps.length > 0) {
            errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
        }
        
        if (errors.length > 0) {
            throw new Error(`Workflow validation failed: ${errors.join('; ')}`);
        }
    }
    
    async validateTask(task) {
        const errors = [];
        
        if (!task.id) errors.push('Task ID is required');
        if (!task.type) errors.push('Task type is required');
        if (!task.name) errors.push('Task name is required');
        
        // Check if task type is registered
        if (!this.tasks.has(task.type)) {
            errors.push(`Unknown task type: ${task.type}`);
        }
        
        // Validate task-specific configuration
        const taskDefinition = this.tasks.get(task.type);
        if (taskDefinition && taskDefinition.validate) {
            try {
                await taskDefinition.validate(task);
            } catch (error) {
                errors.push(`Task validation failed: ${error.message}`);
            }
        }
        
        return errors;
    }
    
    detectCircularDependencies(tasks) {
        const visited = new Set();
        const recursionStack = new Set();
        const circular = [];
        
        const dfs = (taskId) => {
            if (recursionStack.has(taskId)) {
                circular.push(taskId);
                return true;
            }
            
            if (visited.has(taskId)) {
                return false;
            }
            
            visited.add(taskId);
            recursionStack.add(taskId);
            
            const task = tasks.find(t => t.id === taskId);
            if (task && task.dependsOn) {
                for (const depId of task.dependsOn) {
                    if (dfs(depId)) {
                        return true;
                    }
                }
            }
            
            recursionStack.delete(taskId);
            return false;
        };
        
        for (const task of tasks) {
            if (!visited.has(task.id)) {
                dfs(task.id);
            }
        }
        
        return circular;
    }

    // ===== WORKFLOW EXECUTION =====
    
    async executeWorkflow(workflowId, inputData = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        if (workflow.status === 'running') {
            throw new Error(`Workflow already running: ${workflowId}`);
        }
        
        // Initialize execution context
        workflow.status = 'running';
        workflow.execution.startTime = new Date();
        workflow.execution.currentTask = null;
        workflow.execution.completedTasks = [];
        workflow.execution.failedTasks = [];
        workflow.execution.retryCount = 0;
        workflow.execution.logs = [];
        
        // Merge input data with workflow variables
        const context = {
            workflowId,
            variables: { ...workflow.variables, ...inputData },
            results: new Map(),
            metadata: workflow.metadata
        };
        
        this.emit('workflow:started', { workflowId, workflow, context });
        this.log(workflowId, 'info', `Workflow execution started: ${workflow.name}`);
        
        try {
            // Execute tasks in dependency order
            const executionPlan = this.createExecutionPlan(workflow.tasks);
            await this.executeTasks(workflowId, executionPlan, context);
            
            // Mark workflow as completed
            workflow.status = 'completed';
            workflow.execution.endTime = new Date();
            workflow.execution.duration = workflow.execution.endTime - workflow.execution.startTime;
            
            this.emit('workflow:completed', { workflowId, workflow, context });
            this.log(workflowId, 'info', `Workflow completed successfully in ${workflow.execution.duration}ms`);
            
            return {
                workflowId,
                status: 'completed',
                duration: workflow.execution.duration,
                results: Object.fromEntries(context.results)
            };
            
        } catch (error) {
            // Mark workflow as failed
            workflow.status = 'failed';
            workflow.execution.endTime = new Date();
            workflow.execution.duration = workflow.execution.endTime - workflow.execution.startTime;
            workflow.execution.error = error.message;
            
            this.emit('workflow:failed', { workflowId, workflow, error, context });
            this.log(workflowId, 'error', `Workflow failed: ${error.message}`);
            
            throw error;
        }
    }
    
    createExecutionPlan(tasks) {
        const plan = [];
        const completed = new Set();
        const remaining = [...tasks];
        
        while (remaining.length > 0) {
            const readyTasks = remaining.filter(task => {
                if (!task.dependsOn || task.dependsOn.length === 0) {
                    return true;
                }
                return task.dependsOn.every(depId => completed.has(depId));
            });
            
            if (readyTasks.length === 0) {
                throw new Error('Circular dependency or missing dependency detected');
            }
            
            // Group parallel tasks
            const parallelGroup = readyTasks.filter(task => 
                !task.sequential && readyTasks.some(t => t !== task && this.canRunInParallel(task, t))
            );
            
            const sequentialTasks = readyTasks.filter(task => 
                task.sequential || !parallelGroup.includes(task)
            );
            
            // Add parallel group
            if (parallelGroup.length > 1) {
                plan.push({
                    type: 'parallel',
                    tasks: parallelGroup
                });
                parallelGroup.forEach(task => {
                    completed.add(task.id);
                    remaining.splice(remaining.indexOf(task), 1);
                });
            }
            
            // Add sequential tasks
            sequentialTasks.forEach(task => {
                plan.push({
                    type: 'sequential',
                    tasks: [task]
                });
                completed.add(task.id);
                remaining.splice(remaining.indexOf(task), 1);
            });
        }
        
        return plan;
    }
    
    canRunInParallel(task1, task2) {
        // Check if tasks can run in parallel based on resource conflicts
        const resources1 = task1.resources || [];
        const resources2 = task2.resources || [];
        
        return !resources1.some(r => resources2.includes(r));
    }
    
    async executeTasks(workflowId, executionPlan, context) {
        for (const step of executionPlan) {
            if (step.type === 'parallel') {
                await this.executeParallelTasks(workflowId, step.tasks, context);
            } else {
                await this.executeSequentialTasks(workflowId, step.tasks, context);
            }
        }
    }
    
    async executeParallelTasks(workflowId, tasks, context) {
        const promises = tasks.map(task => 
            this.executeTask(workflowId, task, context)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Check for failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            throw new Error(`Parallel task execution failed: ${failures.map(f => f.reason.message).join('; ')}`);
        }
    }
    
    async executeSequentialTasks(workflowId, tasks, context) {
        for (const task of tasks) {
            await this.executeTask(workflowId, task, context);
        }
    }
    
    async executeTask(workflowId, task, context) {
        const workflow = this.workflows.get(workflowId);
        workflow.execution.currentTask = task.id;
        
        this.emit('task:started', { workflowId, task, context });
        this.log(workflowId, 'info', `Starting task: ${task.name} (${task.id})`);
        
        const startTime = Date.now();
        let retryCount = 0;
        
        while (retryCount <= this.config.maxRetries) {
            try {
                // Check conditions
                if (task.condition && !await this.evaluateCondition(task.condition, context)) {
                    this.log(workflowId, 'info', `Task skipped due to condition: ${task.name}`);
                    return { skipped: true, reason: 'condition_not_met' };
                }
                
                // Execute task
                const executor = this.executors.get(task.type);
                if (!executor) {
                    throw new Error(`No executor found for task type: ${task.type}`);
                }
                
                // Set timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Task timeout')), 
                        task.timeout || this.config.timeoutMs);
                });
                
                const executionPromise = executor.execute(task, context);
                const result = await Promise.race([executionPromise, timeoutPromise]);
                
                // Store result
                context.results.set(task.id, result);
                workflow.execution.completedTasks.push(task.id);
                
                const duration = Date.now() - startTime;
                this.emit('task:completed', { workflowId, task, result, duration, context });
                this.log(workflowId, 'info', `Task completed: ${task.name} (${duration}ms)`);
                
                return result;
                
            } catch (error) {
                retryCount++;
                
                if (retryCount <= this.config.maxRetries) {
                    this.log(workflowId, 'warn', `Task failed, retrying (${retryCount}/${this.config.maxRetries}): ${error.message}`);
                    await this.delay(this.config.retryDelay * retryCount);
                } else {
                    workflow.execution.failedTasks.push(task.id);
                    
                    const duration = Date.now() - startTime;
                    this.emit('task:failed', { workflowId, task, error, duration, context });
                    this.log(workflowId, 'error', `Task failed permanently: ${task.name} - ${error.message}`);
                    
                    if (task.onError === 'continue') {
                        this.log(workflowId, 'info', `Continuing workflow despite task failure: ${task.name}`);
                        return { failed: true, error: error.message };
                    } else {
                        throw error;
                    }
                }
            }
        }
    }

    // ===== CONDITION EVALUATION =====
    
    async evaluateCondition(condition, context) {
        try {
            switch (condition.type) {
                case 'variable':
                    return this.evaluateVariableCondition(condition, context);
                case 'result':
                    return this.evaluateResultCondition(condition, context);
                case 'expression':
                    return this.evaluateExpressionCondition(condition, context);
                case 'custom':
                    return await this.evaluateCustomCondition(condition, context);
                default:
                    throw new Error(`Unknown condition type: ${condition.type}`);
            }
        } catch (error) {
            console.error(`Condition evaluation failed: ${error.message}`);
            return false;
        }
    }
    
    evaluateVariableCondition(condition, context) {
        const value = context.variables[condition.variable];
        
        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'not_equals':
                return value !== condition.value;
            case 'greater_than':
                return value > condition.value;
            case 'less_than':
                return value < condition.value;
            case 'contains':
                return String(value).includes(condition.value);
            case 'exists':
                return value !== undefined && value !== null;
            default:
                return false;
        }
    }
    
    evaluateResultCondition(condition, context) {
        const result = context.results.get(condition.taskId);
        
        if (!result) {
            return false;
        }
        
        const value = condition.path ? this.getNestedValue(result, condition.path) : result;
        
        switch (condition.operator) {
            case 'success':
                return !result.failed && !result.error;
            case 'failure':
                return result.failed || result.error;
            case 'equals':
                return value === condition.value;
            case 'not_equals':
                return value !== condition.value;
            default:
                return false;
        }
    }
    
    evaluateExpressionCondition(condition, context) {
        // Simple expression evaluator (could be enhanced with a proper parser)
        let expression = condition.expression;
        
        // Replace variables
        for (const [key, value] of Object.entries(context.variables)) {
            expression = expression.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
        }
        
        // Replace results
        for (const [taskId, result] of context.results) {
            expression = expression.replace(new RegExp(`\\$\\{${taskId}\\}`, 'g'), JSON.stringify(result));
        }
        
        try {
            // Use Function constructor for safe evaluation (limited scope)
            return new Function('return ' + expression)();
        } catch (error) {
            console.error(`Expression evaluation failed: ${error.message}`);
            return false;
        }
    }
    
    async evaluateCustomCondition(condition, context) {
        const evaluator = this.executors.get('condition_evaluator');
        if (!evaluator) {
            throw new Error('Custom condition evaluator not found');
        }
        
        return await evaluator.execute(condition, context);
    }

    // ===== TASK DEFINITIONS =====
    
    registerTask(taskType, definition) {
        this.tasks.set(taskType, {
            type: taskType,
            name: definition.name,
            description: definition.description,
            parameters: definition.parameters || [],
            validate: definition.validate,
            ...definition
        });
        
        console.log(`✅ Task type registered: ${taskType}`);
    }
    
    registerExecutor(taskType, executor) {
        this.executors.set(taskType, executor);
        console.log(`✅ Executor registered: ${taskType}`);
    }
    
    initializeBuiltInTasks() {
        // HTTP Request Task
        this.registerTask('http_request', {
            name: 'HTTP Request',
            description: 'Make HTTP requests to external APIs',
            parameters: [
                { name: 'url', type: 'string', required: true },
                { name: 'method', type: 'string', default: 'GET' },
                { name: 'headers', type: 'object', default: {} },
                { name: 'body', type: 'object', default: null }
            ],
            validate: (task) => {
                if (!task.config.url) {
                    throw new Error('URL is required for HTTP request task');
                }
            }
        });
        
        this.registerExecutor('http_request', {
            execute: async (task, context) => {
                const axios = require('axios');
                const config = this.interpolateVariables(task.config, context);
                
                const response = await axios({
                    url: config.url,
                    method: config.method || 'GET',
                    headers: config.headers || {},
                    data: config.body
                });
                
                return {
                    status: response.status,
                    headers: response.headers,
                    data: response.data
                };
            }
        });
        
        // Delay Task
        this.registerTask('delay', {
            name: 'Delay',
            description: 'Wait for a specified amount of time',
            parameters: [
                { name: 'duration', type: 'number', required: true, description: 'Delay in milliseconds' }
            ]
        });
        
        this.registerExecutor('delay', {
            execute: async (task, context) => {
                const duration = task.config.duration || 1000;
                await this.delay(duration);
                return { delayed: duration };
            }
        });
        
        // Variable Assignment Task
        this.registerTask('set_variable', {
            name: 'Set Variable',
            description: 'Set or update workflow variables',
            parameters: [
                { name: 'variables', type: 'object', required: true }
            ]
        });
        
        this.registerExecutor('set_variable', {
            execute: async (task, context) => {
                const variables = this.interpolateVariables(task.config.variables, context);
                Object.assign(context.variables, variables);
                return { updated: Object.keys(variables) };
            }
        });
        
        // Log Task
        this.registerTask('log', {
            name: 'Log Message',
            description: 'Log a message with specified level',
            parameters: [
                { name: 'message', type: 'string', required: true },
                { name: 'level', type: 'string', default: 'info' }
            ]
        });
        
        this.registerExecutor('log', {
            execute: async (task, context) => {
                const message = this.interpolateVariables(task.config.message, context);
                const level = task.config.level || 'info';
                
                this.log(context.workflowId, level, message);
                return { logged: message, level };
            }
        });
        
        // File Operation Task
        this.registerTask('file_operation', {
            name: 'File Operation',
            description: 'Perform file system operations',
            parameters: [
                { name: 'operation', type: 'string', required: true },
                { name: 'path', type: 'string', required: true },
                { name: 'content', type: 'string', default: null }
            ]
        });
        
        this.registerExecutor('file_operation', {
            execute: async (task, context) => {
                const config = this.interpolateVariables(task.config, context);
                
                switch (config.operation) {
                    case 'read':
                        const content = await fs.readFile(config.path, 'utf8');
                        return { content };
                    case 'write':
                        await fs.writeFile(config.path, config.content || '');
                        return { written: config.path };
                    case 'exists':
                        try {
                            await fs.access(config.path);
                            return { exists: true };
                        } catch {
                            return { exists: false };
                        }
                    default:
                        throw new Error(`Unknown file operation: ${config.operation}`);
                }
            }
        });
    }

    // ===== WORKFLOW TEMPLATES =====
    
    async createTemplate(templateData) {
        const templateId = this.generateTemplateId();
        
        const template = {
            id: templateId,
            name: templateData.name,
            description: templateData.description,
            category: templateData.category || 'general',
            version: templateData.version || '1.0.0',
            workflow: templateData.workflow,
            parameters: templateData.parameters || [],
            created: new Date(),
            updated: new Date()
        };
        
        this.templates.set(templateId, template);
        
        console.log(`✅ Workflow template created: ${template.name}`);
        return template;
    }
    
    async instantiateTemplate(templateId, parameters = {}) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        // Clone template workflow
        const workflow = JSON.parse(JSON.stringify(template.workflow));
        
        // Apply parameters
        const workflowData = this.interpolateTemplateParameters(workflow, parameters);
        
        return await this.createWorkflow(workflowData);
    }
    
    interpolateTemplateParameters(workflow, parameters) {
        const json = JSON.stringify(workflow);
        let interpolated = json;
        
        for (const [key, value] of Object.entries(parameters)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            interpolated = interpolated.replace(regex, JSON.stringify(value));
        }
        
        return JSON.parse(interpolated);
    }

    // ===== TRIGGERS =====
    
    async setupTriggers(workflowId) {
        const workflow = this.workflows.get(workflowId);
        
        for (const trigger of workflow.triggers) {
            switch (trigger.type) {
                case 'webhook':
                    await this.setupWebhookTrigger(workflowId, trigger);
                    break;
                case 'schedule':
                    await this.setupScheduleTrigger(workflowId, trigger);
                    break;
                case 'file_watch':
                    await this.setupFileWatchTrigger(workflowId, trigger);
                    break;
                case 'event':
                    await this.setupEventTrigger(workflowId, trigger);
                    break;
            }
        }
    }
    
    async setupWebhookTrigger(workflowId, trigger) {
        // Webhook trigger setup would integrate with web server
        console.log(`Setting up webhook trigger for workflow ${workflowId}: ${trigger.path}`);
    }
    
    async setupScheduleTrigger(workflowId, trigger) {
        const schedule = trigger.schedule; // cron expression
        // Schedule using node-cron or similar
        console.log(`Setting up schedule trigger for workflow ${workflowId}: ${schedule}`);
    }
    
    async setupFileWatchTrigger(workflowId, trigger) {
        const fs = require('fs');
        fs.watchFile(trigger.path, () => {
            this.executeWorkflow(workflowId, { trigger: 'file_change', path: trigger.path });
        });
    }
    
    async setupEventTrigger(workflowId, trigger) {
        this.on(trigger.event, (data) => {
            if (this.matchesEventFilter(data, trigger.filter)) {
                this.executeWorkflow(workflowId, { trigger: 'event', event: trigger.event, data });
            }
        });
    }
    
    matchesEventFilter(data, filter) {
        if (!filter) return true;
        
        for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) {
                return false;
            }
        }
        
        return true;
    }

    // ===== MONITORING =====
    
    startMonitoring() {
        setInterval(() => {
            this.collectMetrics();
            this.cleanupCompletedWorkflows();
        }, 60000); // Every minute
    }
    
    collectMetrics() {
        const now = new Date();
        const metrics = {
            timestamp: now,
            activeWorkflows: Array.from(this.workflows.values()).filter(w => w.status === 'running').length,
            completedWorkflows: Array.from(this.workflows.values()).filter(w => w.status === 'completed').length,
            failedWorkflows: Array.from(this.workflows.values()).filter(w => w.status === 'failed').length,
            totalWorkflows: this.workflows.size,
            averageExecutionTime: this.calculateAverageExecutionTime(),
            successRate: this.calculateSuccessRate()
        };
        
        this.metrics.set(now.toISOString(), metrics);
        
        // Keep only last 24 hours of metrics
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        for (const [timestamp] of this.metrics) {
            if (new Date(timestamp) < cutoff) {
                this.metrics.delete(timestamp);
            }
        }
    }
    
    calculateAverageExecutionTime() {
        const completedWorkflows = Array.from(this.workflows.values())
            .filter(w => w.status === 'completed' && w.execution.duration > 0);
        
        if (completedWorkflows.length === 0) return 0;
        
        const totalTime = completedWorkflows.reduce((sum, w) => sum + w.execution.duration, 0);
        return Math.round(totalTime / completedWorkflows.length);
    }
    
    calculateSuccessRate() {
        const finishedWorkflows = Array.from(this.workflows.values())
            .filter(w => w.status === 'completed' || w.status === 'failed');
        
        if (finishedWorkflows.length === 0) return 100;
        
        const successfulWorkflows = finishedWorkflows.filter(w => w.status === 'completed').length;
        return Math.round((successfulWorkflows / finishedWorkflows.length) * 100);
    }
    
    cleanupCompletedWorkflows() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        
        for (const [workflowId, workflow] of this.workflows) {
            if ((workflow.status === 'completed' || workflow.status === 'failed') && 
                workflow.execution.endTime < cutoff) {
                
                // Move to history
                this.history.set(workflowId, workflow);
                this.workflows.delete(workflowId);
            }
        }
    }

    // ===== UTILITY METHODS =====
    
    generateWorkflowId() {
        return `workflow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    generateTemplateId() {
        return `template_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    log(workflowId, level, message) {
        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            workflowId
        };
        
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.execution.logs.push(logEntry);
        }
        
        console.log(`[${level.toUpperCase()}] [${workflowId}] ${message}`);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    interpolateVariables(obj, context) {
        if (typeof obj === 'string') {
            let result = obj;
            
            // Replace variables
            for (const [key, value] of Object.entries(context.variables)) {
                result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
            }
            
            // Replace results
            for (const [taskId, taskResult] of context.results) {
                result = result.replace(new RegExp(`\\$\\{${taskId}\\}`, 'g'), JSON.stringify(taskResult));
            }
            
            return result;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateVariables(item, context));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.interpolateVariables(value, context);
            }
            return result;
        }
        
        return obj;
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }
    
    // ===== API METHODS =====
    
    async getWorkflow(workflowId) {
        return this.workflows.get(workflowId) || this.history.get(workflowId);
    }
    
    async listWorkflows(status = null) {
        const workflows = Array.from(this.workflows.values());
        
        if (status) {
            return workflows.filter(w => w.status === status);
        }
        
        return workflows;
    }
    
    async pauseWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        if (workflow.status !== 'running') {
            throw new Error(`Cannot pause workflow in status: ${workflow.status}`);
        }
        
        workflow.status = 'paused';
        this.emit('workflow:paused', { workflowId, workflow });
        
        return workflow;
    }
    
    async resumeWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        if (workflow.status !== 'paused') {
            throw new Error(`Cannot resume workflow in status: ${workflow.status}`);
        }
        
        workflow.status = 'running';
        this.emit('workflow:resumed', { workflowId, workflow });
        
        return workflow;
    }
    
    async cancelWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        
        workflow.status = 'cancelled';
        workflow.execution.endTime = new Date();
        workflow.execution.duration = workflow.execution.endTime - workflow.execution.startTime;
        
        this.emit('workflow:cancelled', { workflowId, workflow });
        
        return workflow;
    }
    
    async getMetrics() {
        return {
            current: Array.from(this.metrics.values()).slice(-1)[0],
            history: Array.from(this.metrics.values()),
            workflows: {
                total: this.workflows.size,
                byStatus: this.getWorkflowsByStatus()
            }
        };
    }
    
    getWorkflowsByStatus() {
        const byStatus = {};
        
        for (const workflow of this.workflows.values()) {
            byStatus[workflow.status] = (byStatus[workflow.status] || 0) + 1;
        }
        
        return byStatus;
    }
}

module.exports = WorkflowEngine;

