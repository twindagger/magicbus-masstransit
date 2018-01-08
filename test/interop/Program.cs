using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MassTransit;
using MassTransit.RabbitMqTransport;
using Microsoft.Extensions.Configuration;

namespace interop
{
    public class Program {
        static IConfigurationRoot Configuration;
        static TaskCompletionSource<MyCustomMessageType> Consumed = new TaskCompletionSource<MyCustomMessageType>();

        public const int ProvidedIntValue = 42;
        public const bool ProvidedBoolValue = false;
        public const string ProvidedStringValue = "dotnet-string";
        public static readonly DateTime ProvidedDateValue = DateTime.Parse("2016-07-24T18:47:36Z").ToUniversalTime();

        public const int ExpectedIntValue = 43;
        public const bool ExpectedBoolValue = true;
        public const string ExpectedStringValue = "js-string";
        public static readonly DateTime ExpectedDateValue = DateTime.Parse("2016-07-25T12:43:09Z").ToUniversalTime();

        private static string RabbitMqHost => Configuration["RABBITMQ_HOST"] ?? "localhost";
        private static string RabbitMqPort => Configuration["RABBITMQ_PORT"] ?? "5672";
        private static string RabbitMqVhost => Configuration["RABBITMQ_VHOST"] ?? "";
        private static string RabbitMqUser => Configuration["RABBITMQ_USER"] ?? "guest";
        private static string RabbitMqPassword => Configuration["RABBITMQ_PASS"] ?? "guest";
        private static Uri RabbitMqUri => new Uri($"rabbitmq://{RabbitMqHost}:{RabbitMqPort}/{RabbitMqVhost}");

        static void Main(string[] args) {
            Console.WriteLine("Starting Bus");
            Configuration = new ConfigurationBuilder()
                .AddEnvironmentVariables()
                .Build();

            var isConsume = args.Length == 2 && args[1].Equals("consume", StringComparison.OrdinalIgnoreCase);
            (isConsume ? RunConsumeScenario() : RunPublishScenario()).Wait();
            Environment.Exit(Environment.ExitCode);
        }

        static async Task RunPublishScenario()
        {
            var bus = await StartBus();
            await bus.Publish<MyCustomMessageType>(new {
                IntValue = ProvidedIntValue,
                BoolValue = ProvidedBoolValue,
                StringValue = ProvidedStringValue,
                DateValue = ProvidedDateValue
            });
            Console.WriteLine("Published Message");
        }

        static async Task RunConsumeScenario()
        {
            var bus = await StartBus(true);
            await Task.WhenAny(Task.Delay(20000), Consumed.Task);
            if (!Consumed.Task.IsCompletedSuccessfully)
            {
                Console.WriteLine("No message consumed");
                Environment.ExitCode = 1;
                return;
            }
            var message = Consumed.Task.Result;
            var errors = new List<string>();

            if (message.IntValue != ExpectedIntValue)
            {
                errors.Add($"Expected IntValue={ExpectedIntValue}, got {message.IntValue}");
            }
            if (message.BoolValue != ExpectedBoolValue)
            {
                errors.Add($"Expected BoolValue={ExpectedBoolValue}, got {message.BoolValue}");
            }
            if (message.StringValue != ExpectedStringValue)
            {
                errors.Add($"Expected StringValue={ExpectedStringValue}, got {message.StringValue}");
            }
            if (message.DateValue != ExpectedDateValue)
            {
                errors.Add($"Expected DateValue={ExpectedDateValue}, got {message.DateValue}");
            }

            if (errors.Count > 0)
            {
                Console.WriteLine("Errors: ");
                Console.WriteLine(string.Join("\n", errors));
                Environment.ExitCode = 2;
            }
            else
            {
                Console.WriteLine("Success!");
            }
        }

        static async Task<IBusControl> StartBus(bool configureReceiveEndpoint = false)
        {
            var rabbitUri = RabbitMqUri;
            Console.WriteLine($"Connecting to {rabbitUri}");
            var bus = Bus.Factory.CreateUsingRabbitMq(sbc =>
            {
                var host = sbc.Host(rabbitUri, h =>
                {
                    h.Username(RabbitMqUser);
                    h.Password(RabbitMqPassword);
                });
                if (configureReceiveEndpoint)
                {
                    var queueName = host.GetTemporaryQueueName("inproc-test");
                    Console.WriteLine($"Configuring Receive Endpoint at {queueName}");
                    sbc.ReceiveEndpoint(host, queueName, ep =>
                    {
                        ep.Durable = false;
                        ep.AutoDelete = true;
                        ep.Exclusive = true;
                        ep.Handler<MyCustomMessageType>(context =>
                        {
                            Consumed.SetResult(context.Message);
                            return Task.CompletedTask;
                        });
                    });
                }
            });
            await bus.StartAsync();
            return bus;
        }
    }

    public interface MyCustomMessageType
    {
        int IntValue { get; set; }
        bool BoolValue { get; set; }
        string StringValue { get; set; }
        DateTime DateValue { get; set; }
    }
}
